"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
/**
 * Seeds the PostalCodeZone table with 3-char FSA lookup data.
 * Run after schema exists: pnpm run build && pnpm run seed:postal-zones
 *
 * There is no free Canadian API for FSA-based shipping rates. This seed:
 * - Generates all valid Canadian FSAs (format: letter + digit + letter; Canada Post uses 18 letters).
 * - Inserts one row per FSA with a default rate; you can edit specific FSAs (e.g. remote) at /shipping-rates.
 * - Fills city and region from FSA first letter (Canada Post province/area).
 * - Also ensures CA (default) and US (default) exist.
 */
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
const postal_code_zone_entity_1 = require("./plugins/shipping-plugin/entities/postal-code-zone.entity");
const fsa_region_city_1 = require("./fsa-region-city");
const DEFAULT_CA_CENTS = 1200; // $12 fallback when no FSA row or rate not set
const DEFAULT_US_CENTS = 1800; // $18
/** FSA rows start at 0; you add your own rate per zone at /shipping-rates. */
const FSA_INITIAL_RATE_CENTS = 0;
/** Letters used in Canadian postal codes (excludes D, F, I, O, Q, U, W, Z to avoid confusion). */
const CA_FSA_LETTERS = "ABCEGHJKLMNPRSTVXY";
function* allCanadianFsas() {
    for (const a of CA_FSA_LETTERS) {
        for (let n = 0; n <= 9; n++) {
            for (const b of CA_FSA_LETTERS) {
                yield `${a}${n}${b}`;
            }
        }
    }
}
async function seed() {
    const { app } = await (0, core_1.bootstrapWorker)(vendure_config_1.config);
    const connection = app.get(core_1.TransactionalConnection);
    const requestContextService = app.get(core_1.RequestContextService);
    const ctx = await requestContextService.create({ apiType: "admin" });
    const repo = connection.getRepository(ctx, postal_code_zone_entity_1.PostalCodeZone);
    const existing = await repo.find();
    const key = (z) => `${z.countryCode}:${z.prefix}`;
    const existingKeys = new Set(existing.map(key));
    let added = 0;
    if (!existingKeys.has("CA:")) {
        await repo.save(repo.create({
            countryCode: "CA",
            prefix: "",
            zoneName: "Canada (default)",
            rateCents: DEFAULT_CA_CENTS,
        }));
        existingKeys.add("CA:");
        added++;
    }
    if (!existingKeys.has("US:")) {
        await repo.save(repo.create({
            countryCode: "US",
            prefix: "",
            zoneName: "United States",
            rateCents: DEFAULT_US_CENTS,
        }));
        added++;
    }
    const BATCH = 200;
    let batch = [];
    for (const fsa of allCanadianFsas()) {
        if (existingKeys.has(`CA:${fsa}`))
            continue;
        const region = (0, fsa_region_city_1.getRegionForFsa)(fsa);
        const city = (0, fsa_region_city_1.getCityLabelForFsa)(fsa);
        batch.push({
            countryCode: "CA",
            prefix: fsa,
            zoneName: `FSA ${fsa}`,
            city: city || null,
            region: region || null,
            rateCents: FSA_INITIAL_RATE_CENTS,
        });
        existingKeys.add(`CA:${fsa}`);
        if (batch.length >= BATCH) {
            await repo.save(batch.map((b) => repo.create(b)));
            added += batch.length;
            batch = [];
        }
    }
    if (batch.length > 0) {
        await repo.save(batch.map((b) => repo.create(b)));
        added += batch.length;
    }
    // Backfill city/region for existing Canadian FSA rows that have nulls
    const toUpdate = await repo.find({ where: { countryCode: "CA" } });
    const needsBackfill = toUpdate.filter((z) => z.prefix.length === 3 && (!z.city || !z.region));
    if (needsBackfill.length > 0) {
        for (const z of needsBackfill) {
            z.region = (0, fsa_region_city_1.getRegionForFsa)(z.prefix) || z.region;
            z.city = (0, fsa_region_city_1.getCityLabelForFsa)(z.prefix) || z.city;
        }
        await repo.save(needsBackfill);
        core_1.Logger.info(`PostalCodeZone seed: backfilled city/region for ${needsBackfill.length} existing row(s).`);
    }
    core_1.Logger.info(`PostalCodeZone seed: ${added} row(s) added.`);
    await app.close();
}
if (require.main === module) {
    seed()
        .then(() => {
        core_1.Logger.info("Postal code zones seeded.");
        process.exit(0);
    })
        .catch((err) => {
        core_1.Logger.error(err);
        process.exit(1);
    });
}
