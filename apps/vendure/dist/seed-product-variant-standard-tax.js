"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
/**
 * Sets every ProductVariant.taxCategory to the **Standard** tax category.
 * Run: pnpm run build && pnpm run seed:standard-tax-on-products
 *
 * Vendure applies line-item tax from the variant’s tax category + active tax zone.
 * If variants used "Reduced" or another category without CA-ON rates, Admin shows
 * "No configured tax rate" on products while shipping (which uses Standard in the
 * postal calculator) still shows tax.
 */
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
async function seed() {
    const { app } = await (0, core_1.bootstrapWorker)(vendure_config_1.config);
    const connection = app.get(core_1.TransactionalConnection);
    const taxCategoryService = app.get(core_1.TaxCategoryService);
    const requestContextService = app.get(core_1.RequestContextService);
    const ctx = await requestContextService.create({ apiType: "admin" });
    const { items: categories } = await taxCategoryService.findAll(ctx, { take: 50 });
    const standard = categories.find((c) => c.name === "Standard");
    const fallback = categories.find((c) => c.isDefault);
    const target = standard ?? fallback;
    if (!target) {
        core_1.Logger.error('No "Standard" (or default) tax category found. Run seed:canadian-tax or create Standard in Admin.');
        await app.close();
        process.exit(1);
    }
    const standardId = target.id;
    const label = standard ? "Standard" : "default tax category";
    core_1.Logger.info(`Using tax category "${label}" (id=${standardId}) for all variants.`);
    const repo = connection.getRepository(ctx, core_1.ProductVariant);
    // Assign Standard to every variant so order lines use the same category as provincial tax rates.
    const result = await repo
        .createQueryBuilder()
        .update(core_1.ProductVariant)
        .set({ taxCategory: { id: standardId } })
        .execute();
    core_1.Logger.info(`Updated ${result.affected ?? 0} product variant row(s) to use ${label}. Re-open or recalculate active orders in Admin if needed.`);
    await app.close();
}
if (require.main === module) {
    seed()
        .then(() => {
        core_1.Logger.info("seed-product-variant-standard-tax finished.");
        process.exit(0);
    })
        .catch((err) => {
        core_1.Logger.error(err);
        process.exit(1);
    });
}
