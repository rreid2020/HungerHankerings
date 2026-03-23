"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
/**
 * Seeds Canadian province zones and tax rates for province-based tax.
 * Run after migrations: pnpm run build && pnpm run seed:canadian-tax
 *
 * Creates zones CA-AB, CA-BC, ... CA-YT and "Canada" (fallback), each with
 * Canada as member, and a Standard tax rate per zone.
 */
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
const PROVINCE_ZONES = [
    "CA-AB",
    "CA-BC",
    "CA-MB",
    "CA-NB",
    "CA-NL",
    "CA-NS",
    "CA-NT",
    "CA-NU",
    "CA-ON",
    "CA-PE",
    "CA-QC",
    "CA-SK",
    "CA-YT",
];
/** Province zone code -> tax rate (percentage, e.g. 13 = 13% HST). */
const TAX_RATES = {
    "CA-AB": 5,
    "CA-BC": 12,
    "CA-MB": 12,
    "CA-NB": 15,
    "CA-NL": 15,
    "CA-NS": 15,
    "CA-NT": 5,
    "CA-NU": 5,
    "CA-ON": 13,
    "CA-PE": 15,
    "CA-QC": 14.975,
    "CA-SK": 11,
    "CA-YT": 5,
    Canada: 13, // fallback
};
async function seed() {
    const { app } = await (0, core_1.bootstrapWorker)(vendure_config_1.config);
    const zoneService = app.get(core_1.ZoneService);
    const countryService = app.get(core_1.CountryService);
    const taxRateService = app.get(core_1.TaxRateService);
    const taxCategoryService = app.get(core_1.TaxCategoryService);
    const channelService = app.get(core_1.ChannelService);
    const requestContextService = app.get(core_1.RequestContextService);
    const ctx = await requestContextService.create({ apiType: "admin" });
    // Ensure Canada is available and get its id (used as zone member)
    let canada;
    try {
        canada = (await countryService.findOneByCode(ctx, "CA"));
    }
    catch (e) {
        core_1.Logger.error("Canada (CA) not found. Enable Canada in Settings → Countries first.");
        throw e;
    }
    const canadaId = canada.id;
    const existingZones = await zoneService.getAllWithMembers(ctx);
    const existingByName = new Map(existingZones.map((z) => [z.name, z]));
    const zoneIds = {};
    // Create province zones and fallback Canada zone
    for (const name of [...PROVINCE_ZONES, "Canada"]) {
        const existing = existingByName.get(name);
        if (existing) {
            zoneIds[name] = existing.id;
            core_1.Logger.info(`Zone "${name}" already exists`);
            continue;
        }
        const zone = await zoneService.create(ctx, { name });
        zoneIds[name] = zone.id;
        await zoneService.addMembersToZone(ctx, {
            zoneId: zoneIds[name],
            memberIds: [canadaId],
        });
        core_1.Logger.info(`Created zone "${name}" and added Canada`);
    }
    // Get or create default tax category (Standard)
    const { items: categories } = await taxCategoryService.findAll(ctx, { take: 20 });
    let standardCategory = categories.find((c) => c.name === "Standard" || c.isDefault);
    if (!standardCategory) {
        standardCategory = await taxCategoryService.create(ctx, {
            name: "Standard",
            isDefault: true,
        });
        core_1.Logger.info("Created default tax category 'Standard'");
    }
    const categoryId = standardCategory.id;
    // Create tax rate per zone for Standard (primary pass)
    const { items: rates } = await taxRateService.findAll(ctx, { take: 500 }, ["zone", "category"]);
    const rateKey = (zoneId, catId) => `${zoneId}:${catId}`;
    const existingRateKeys = new Set(rates
        .filter((r) => r.zone?.id && r.category?.id)
        .map((r) => rateKey(r.zone.id, r.category.id)));
    for (const name of [...PROVINCE_ZONES, "Canada"]) {
        const zoneId = zoneIds[name];
        if (!zoneId)
            continue;
        if (existingRateKeys.has(rateKey(zoneId, categoryId))) {
            core_1.Logger.info(`Tax rate for zone "${name}" (Standard) already exists`);
            continue;
        }
        const value = TAX_RATES[name] ?? 13;
        await taxRateService.create(ctx, {
            name: `Canada ${name === "Canada" ? "default" : name.replace("CA-", "")} (${value}%)`,
            zoneId,
            categoryId,
            value,
            enabled: true,
        });
        existingRateKeys.add(rateKey(zoneId, categoryId));
        core_1.Logger.info(`Created tax rate for "${name}" at ${value}% (Standard)`);
    }
    // Duplicate provincial rates for every other tax category (e.g. "Reduced", custom categories).
    // Otherwise order lines show "No configured tax rate" while shipping (Standard) still gets tax.
    const { items: allCategories } = await taxCategoryService.findAll(ctx, { take: 100 });
    for (const cat of allCategories) {
        const catId = cat.id;
        if (catId === categoryId)
            continue;
        for (const name of [...PROVINCE_ZONES, "Canada"]) {
            const zoneId = zoneIds[name];
            if (!zoneId)
                continue;
            if (existingRateKeys.has(rateKey(zoneId, catId)))
                continue;
            const value = TAX_RATES[name] ?? 13;
            const catName = cat.name ?? "category";
            await taxRateService.create(ctx, {
                name: `${catName} — ${name === "Canada" ? "Canada default" : name} (${value}%)`,
                zoneId,
                categoryId: catId,
                value,
                enabled: true,
            });
            existingRateKeys.add(rateKey(zoneId, catId));
            core_1.Logger.info(`Created tax rate for zone "${name}" category "${catName}" at ${value}%`);
        }
    }
    // Set channel default tax zone to "Canada" fallback so product list has a zone before address is set
    const { items: channels } = await channelService.findAll(ctx, { take: 1 });
    const defaultChannel = channels[0];
    if (defaultChannel && zoneIds["Canada"]) {
        await channelService.update(ctx, {
            id: defaultChannel.id,
            defaultTaxZoneId: zoneIds["Canada"],
        });
        core_1.Logger.info("Set channel default tax zone to Canada");
    }
    await app.close();
}
if (require.main === module) {
    seed()
        .then(() => {
        core_1.Logger.info("Canadian tax zones and rates seeded successfully.");
        process.exit(0);
    })
        .catch((err) => {
        core_1.Logger.error(err);
        process.exit(1);
    });
}
