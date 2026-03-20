"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostalCodeZoneService = void 0;
const postal_code_zone_entity_1 = require("./entities/postal-code-zone.entity");
/**
 * Look up shipping rate (cents) by country and postal code.
 * Canada: 3-character FSA only (e.g. K0K, M5V); if no row, use country default (prefix "").
 * US: country default only. Add rows for FSAs that need a specific rate (e.g. remote).
 */
class PostalCodeZoneService {
    constructor(connection) {
        this.connection = connection;
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
