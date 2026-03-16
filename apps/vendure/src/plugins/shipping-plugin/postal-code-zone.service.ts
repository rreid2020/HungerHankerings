import { ID, RequestContext, TransactionalConnection } from "@vendure/core";
import { PostalCodeZone } from "./entities/postal-code-zone.entity";

/**
 * Look up shipping rate (cents) by country and postal code.
 * Canada: 3-character FSA only (e.g. K0K, M5V); if no row, use country default (prefix "").
 * US: country default only. Add rows for FSAs that need a specific rate (e.g. remote).
 */
export class PostalCodeZoneService {
  constructor(private connection: TransactionalConnection) {}

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
