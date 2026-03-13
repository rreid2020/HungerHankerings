import { RequestContext, TransactionalConnection } from "@vendure/core";
import { PostalCodeZone } from "./entities/postal-code-zone.entity";

/**
 * Look up shipping rate (cents) by country and postal code first letter.
 * For CA uses prefix; for US uses country default (prefix empty).
 */
export class PostalCodeZoneService {
  constructor(private connection: TransactionalConnection) {}

  async getRateCents(
    ctx: RequestContext,
    countryCode: string,
    prefix: string
  ): Promise<number | null> {
    const repo = this.connection.getRepository(ctx, PostalCodeZone);
    const normalized = (countryCode ?? "").trim().toUpperCase().slice(0, 2);
    const p = (prefix ?? "").trim().toUpperCase().slice(0, 1);

    const row = await repo.findOne({
      where: { countryCode: normalized, prefix: p || "" },
    });
    if (row) return row.rateCents;

    const defaultRow = await repo.findOne({
      where: { countryCode: normalized, prefix: "" },
    });
    return defaultRow?.rateCents ?? null;
  }
}
