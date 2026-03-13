"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostalCodeZoneService = void 0;
const postal_code_zone_entity_1 = require("./entities/postal-code-zone.entity");
/**
 * Look up shipping rate (cents) by country and postal code first letter.
 * For CA uses prefix; for US uses country default (prefix empty).
 */
class PostalCodeZoneService {
    constructor(connection) {
        this.connection = connection;
    }
    async getRateCents(ctx, countryCode, prefix) {
        const repo = this.connection.getRepository(ctx, postal_code_zone_entity_1.PostalCodeZone);
        const normalized = (countryCode ?? "").trim().toUpperCase().slice(0, 2);
        const p = (prefix ?? "").trim().toUpperCase().slice(0, 1);
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
    async findAll(ctx) {
        const repo = this.connection.getRepository(ctx, postal_code_zone_entity_1.PostalCodeZone);
        return repo.find({ order: { countryCode: "ASC", prefix: "ASC" } });
    }
    async updateRate(ctx, id, rateCents) {
        const repo = this.connection.getRepository(ctx, postal_code_zone_entity_1.PostalCodeZone);
        const zone = await repo.findOne({ where: { id: id } });
        if (!zone)
            return null;
        zone.rateCents = Math.round(rateCents);
        return repo.save(zone);
    }
}
exports.PostalCodeZoneService = PostalCodeZoneService;
