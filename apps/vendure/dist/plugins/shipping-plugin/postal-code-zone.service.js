"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostalCodeZoneService = void 0;
const pg_1 = require("pg");
const postal_code_zone_entity_1 = require("./entities/postal-code-zone.entity");
const FALLBACK_ZONE_CODE = "FALLBACK_CANADA";
let adminShippingPool = null;
function stripSslModeFromUrl(rawUrl) {
    try {
        const u = new URL(rawUrl);
        u.searchParams.delete("sslmode");
        const out = u.toString();
        return out.endsWith("?") ? out.slice(0, -1) : out;
    }
    catch {
        return rawUrl.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, "");
    }
}
function adminDbSsl() {
    if (process.env.DB_SSL === "false")
        return false;
    return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" };
}
function resolveAdminDbConnectionString() {
    const direct = process.env.LEADS_DATABASE_URL?.trim();
    if (direct)
        return direct;
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
function getAdminShippingPool() {
    if (adminShippingPool)
        return adminShippingPool;
    const raw = resolveAdminDbConnectionString();
    if (!raw)
        return null;
    const ssl = adminDbSsl();
    const cfg = {
        connectionString: ssl === false ? raw : stripSslModeFromUrl(raw),
        max: 3,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
        keepAlive: true,
    };
    if (ssl !== false)
        cfg.ssl = ssl;
    adminShippingPool = new pg_1.Pool(cfg);
    return adminShippingPool;
}
/**
 * Look up shipping rate (cents) by country and postal code.
 * Canada: 3-character FSA only (e.g. K0K, M5V); if no row, use country default (prefix "").
 * US: country default only. Add rows for FSAs that need a specific rate (e.g. remote).
 */
class PostalCodeZoneService {
    constructor(connection) {
        this.connection = connection;
    }
    async getAdminRateCentsByPostal(countryCode, postalCode, orderSubtotalCents = 0) {
        const country = (countryCode ?? "").trim().toUpperCase().slice(0, 2);
        const postal = (postalCode ?? "").trim().toUpperCase().replace(/\s/g, "");
        const fsa = postal.slice(0, 3);
        if (country !== "CA" || !fsa)
            return null;
        const pool = getAdminShippingPool();
        if (!pool)
            return null;
        const result = await pool.query(`
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
      `, [fsa, FALLBACK_ZONE_CODE]);
        const row = result.rows[0];
        if (!row)
            return null;
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
    async getRateCents(ctx, countryCode, prefix) {
        if (!this.connection)
            return null;
        const repo = this.connection.getRepository(ctx, postal_code_zone_entity_1.PostalCodeZone);
        const normalized = (countryCode ?? "").trim().toUpperCase().slice(0, 2);
        const p = (prefix ?? "").trim().toUpperCase().slice(0, 6);
        const row = await repo.findOne({
            where: { countryCode: normalized, prefix: p || "" },
        });
        if (row)
            return row.rateCents;
        const defaultRow = await repo.findOne({
            where: { countryCode: normalized, prefix: "" },
        });
        return defaultRow?.rateCents ?? null;
    }
    /** Lookup by full postal: Canada = 3-char FSA then default; US = default only. */
    async getRateCentsByPostal(ctx, countryCode, postalCode) {
        if (!this.connection)
            return null;
        const repo = this.connection.getRepository(ctx, postal_code_zone_entity_1.PostalCodeZone);
        const country = (countryCode ?? "").trim().toUpperCase().slice(0, 2);
        const postal = (postalCode ?? "").trim().toUpperCase().replace(/\s/g, "");
        if (country !== "CA") {
            const row = await repo.findOne({ where: { countryCode: country, prefix: "" } });
            return row?.rateCents ?? null;
        }
        const prefix = postal.slice(0, 3);
        const row = await repo.findOne({ where: { countryCode: country, prefix } });
        if (row && row.rateCents > 0)
            return row.rateCents;
        const defaultRow = await repo.findOne({ where: { countryCode: country, prefix: "" } });
        return defaultRow?.rateCents ?? null;
    }
    async findAll(ctx) {
        if (!this.connection)
            return [];
        const repo = this.connection.getRepository(ctx, postal_code_zone_entity_1.PostalCodeZone);
        return repo.find({ order: { countryCode: "ASC", prefix: "ASC" } });
    }
    async updateZone(ctx, id, rateCents, city, region) {
        if (!this.connection)
            return null;
        const repo = this.connection.getRepository(ctx, postal_code_zone_entity_1.PostalCodeZone);
        const zone = await repo.findOne({ where: { id: id } });
        if (!zone)
            return null;
        zone.rateCents = Math.round(rateCents);
        if (city !== undefined)
            zone.city = city === "" ? null : city;
        if (region !== undefined)
            zone.region = region === "" ? null : region;
        return repo.save(zone);
    }
    /** @deprecated Use updateZone. */
    async updateRate(ctx, id, rateCents) {
        return this.updateZone(ctx, id, rateCents);
    }
}
exports.PostalCodeZoneService = PostalCodeZoneService;
