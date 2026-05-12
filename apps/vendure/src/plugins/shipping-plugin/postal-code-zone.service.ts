import { ID, RequestContext, TransactionalConnection } from "@vendure/core";
import { Pool, type PoolConfig } from "pg";
import { PostalCodeZone } from "./entities/postal-code-zone.entity";

const FALLBACK_ZONE_CODE = "FALLBACK_CANADA";
const PROVINCIAL_FALLBACK_ZONE_PREFIX = "FALLBACK_";

type AdminShippingRate = {
  rateCents: number;
  zoneCode: string;
  zoneName: string;
  postalPrefix: string;
  fallbackUsed: boolean;
  overrideUsed: boolean;
};

let adminShippingPool: Pool | null = null;

function stripSslModeFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete("sslmode");
    const out = u.toString();
    return out.endsWith("?") ? out.slice(0, -1) : out;
  } catch {
    return rawUrl.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, "");
  }
}

function adminDbSsl(): false | { rejectUnauthorized: boolean } {
  if (process.env.DB_SSL === "false") return false;
  return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" };
}

function resolveAdminDbConnectionString(): string | undefined {
  const direct = process.env.LEADS_DATABASE_URL?.trim();
  if (direct) return direct;

  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD;
  const dbName = process.env.LEADS_DATABASE_NAME?.trim() || "hungerhankeringsadmin";
  if (host && port && user && password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
  }
  return process.env.DATABASE_URL?.trim();
}

function getAdminShippingPool(): Pool | null {
  if (adminShippingPool) return adminShippingPool;
  const raw = resolveAdminDbConnectionString();
  if (!raw) return null;
  const ssl = adminDbSsl();
  const cfg: PoolConfig = {
    connectionString: ssl === false ? raw : stripSslModeFromUrl(raw),
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  };
  if (ssl !== false) cfg.ssl = ssl;
  adminShippingPool = new Pool(cfg);
  return adminShippingPool;
}

function inferProvinceFromFsa(fsa: string): string | null {
  const normalized = (fsa ?? "").trim().toUpperCase().slice(0, 3);
  if (!/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]$/i.test(normalized)) return null;
  const c0 = normalized[0];
  if (c0 === "A") return "NL";
  if (c0 === "B") return "NS";
  if (c0 === "C") return "PE";
  if (c0 === "E") return "NB";
  if (c0 === "G" || c0 === "H" || c0 === "J") return "QC";
  if (c0 === "K" || c0 === "L" || c0 === "M" || c0 === "N" || c0 === "P") return "ON";
  if (c0 === "R") return "SK";
  if (c0 === "S") return "MB";
  if (c0 === "T") return "AB";
  if (c0 === "V") return "BC";
  if (c0 === "Y") return "YT";
  if (c0 === "X") {
    if (normalized.startsWith("X0A") || normalized.startsWith("X0B") || normalized.startsWith("X0C")) return "NU";
    return "NT";
  }
  return null;
}

/**
 * Look up shipping rate (cents) by country and postal code.
 * Canada: 3-character FSA only (e.g. K0K, M5V); if no row, use country default (prefix "").
 * US: country default only. Add rows for FSAs that need a specific rate (e.g. remote).
 */
export class PostalCodeZoneService {
  constructor(private connection: TransactionalConnection) {}

  async getAdminRateCentsByPostal(
    countryCode: string,
    postalCode: string,
    orderSubtotalCents = 0
  ): Promise<AdminShippingRate | null> {
    const country = (countryCode ?? "").trim().toUpperCase().slice(0, 2);
    const postal = (postalCode ?? "").trim().toUpperCase().replace(/\s/g, "");
    const fsa = postal.slice(0, 3);
    if (country !== "CA" || !fsa) return null;
    const inferredProvince = inferProvinceFromFsa(fsa);
    const provincialFallbackCode = inferredProvince
      ? `${PROVINCIAL_FALLBACK_ZONE_PREFIX}${inferredProvince}`
      : null;

    const pool = getAdminShippingPool();
    if (!pool) return null;

    const result = await pool.query<{
      source: string;
      province: string | null;
      urban_rural: string | null;
      region_band: string | null;
      zone_code: string;
      zone_name: string;
      flat_rate: string;
      free_shipping_threshold: string;
    }>(
      `
      WITH matched AS (
        SELECT
          1 AS priority,
          'override' AS source,
          r.province,
          r.urban_rural,
          r.region_band,
          z.zone_code,
          z.zone_name,
          z.flat_rate,
          z.free_shipping_threshold
        FROM shipping_fsa_overrides o
        JOIN shipping_zones z ON z.zone_code = o.override_zone_code
        LEFT JOIN postal_fsa_regions r ON r.fsa = o.fsa
        WHERE o.fsa = $1 AND o.active = true AND z.active = true

        UNION ALL

        SELECT
          2 AS priority,
          'region' AS source,
          r.province,
          r.urban_rural,
          r.region_band,
          z.zone_code,
          z.zone_name,
          z.flat_rate,
          z.free_shipping_threshold
        FROM postal_fsa_regions r
        JOIN shipping_zones z ON z.zone_code = r.shipping_zone_code
        WHERE r.fsa = $1 AND r.active = true AND z.active = true

        UNION ALL

        SELECT
          3 AS priority,
          'province_fallback' AS source,
          NULL AS province,
          'fallback' AS urban_rural,
          'fallback' AS region_band,
          z.zone_code,
          z.zone_name,
          z.flat_rate,
          z.free_shipping_threshold
        FROM shipping_zones z
        WHERE $2::VARCHAR IS NOT NULL AND z.zone_code = $2 AND z.active = true

        UNION ALL

        SELECT
          4 AS priority,
          'fallback' AS source,
          NULL AS province,
          'fallback' AS urban_rural,
          'fallback' AS region_band,
          z.zone_code,
          z.zone_name,
          z.flat_rate,
          z.free_shipping_threshold
        FROM shipping_zones z
        WHERE z.zone_code = $2 AND z.active = true
      )
      SELECT * FROM matched ORDER BY priority LIMIT 1
      `,
      [fsa, provincialFallbackCode, FALLBACK_ZONE_CODE]
    );

    const row = result.rows[0];
    if (!row) return null;
    const flatCents = Math.round(Number(row.flat_rate) * 100);
    const thresholdCents = Math.round(Number(row.free_shipping_threshold) * 100);
    return {
      rateCents: orderSubtotalCents >= thresholdCents ? 0 : flatCents,
      zoneCode: row.zone_code,
      zoneName: row.zone_name,
      postalPrefix: fsa,
      fallbackUsed: row.source === "fallback",
      overrideUsed: row.source === "override",
    };
  }

  /** Lookup by exact prefix (used by Admin). */
  async getRateCents(
    ctx: RequestContext,
    countryCode: string,
    prefix: string
  ): Promise<number | null> {
    if (!this.connection) return null;
    const repo = this.connection.getRepository(ctx, PostalCodeZone);
    const normalized = (countryCode ?? "").trim().toUpperCase().slice(0, 2);
    const p = (prefix ?? "").trim().toUpperCase().slice(0, 6);

    const row = await repo.findOne({
      where: { countryCode: normalized, prefix: p || "" },
    });
    if (row) return row.rateCents;

    const defaultRow = await repo.findOne({
      where: { countryCode: normalized, prefix: "" },
    });
    return defaultRow?.rateCents ?? null;
  }

  /** Lookup by full postal: Canada = 3-char FSA then default; US = default only. */
  async getRateCentsByPostal(
    ctx: RequestContext,
    countryCode: string,
    postalCode: string
  ): Promise<number | null> {
    if (!this.connection) return null;
    const repo = this.connection.getRepository(ctx, PostalCodeZone);
    const country = (countryCode ?? "").trim().toUpperCase().slice(0, 2);
    const postal = (postalCode ?? "").trim().toUpperCase().replace(/\s/g, "");

    if (country !== "CA") {
      const row = await repo.findOne({ where: { countryCode: country, prefix: "" } });
      return row?.rateCents ?? null;
    }

    const prefix = postal.slice(0, 3);
    const row = await repo.findOne({ where: { countryCode: country, prefix } });
    if (row && row.rateCents > 0) return row.rateCents;
    const defaultRow = await repo.findOne({ where: { countryCode: country, prefix: "" } });
    return defaultRow?.rateCents ?? null;
  }

  async findAll(ctx: RequestContext): Promise<PostalCodeZone[]> {
    if (!this.connection) return [];
    const repo = this.connection.getRepository(ctx, PostalCodeZone);
    return repo.find({ order: { countryCode: "ASC", prefix: "ASC" } });
  }

  async updateZone(
    ctx: RequestContext,
    id: ID,
    rateCents: number,
    city?: string | null,
    region?: string | null
  ): Promise<PostalCodeZone | null> {
    if (!this.connection) return null;
    const repo = this.connection.getRepository(ctx, PostalCodeZone);
    const zone = await repo.findOne({ where: { id: id as string } });
    if (!zone) return null;
    zone.rateCents = Math.round(rateCents);
    if (city !== undefined) zone.city = city === "" ? null : city;
    if (region !== undefined) zone.region = region === "" ? null : region;
    return repo.save(zone);
  }

  /** @deprecated Use updateZone. */
  async updateRate(ctx: RequestContext, id: ID, rateCents: number): Promise<PostalCodeZone | null> {
    return this.updateZone(ctx, id, rateCents);
  }
}
