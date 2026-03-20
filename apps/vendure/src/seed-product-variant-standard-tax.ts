/**
 * Sets every ProductVariant.taxCategory to the **Standard** tax category.
 * Run: pnpm run build && pnpm run seed:standard-tax-on-products
 *
 * Vendure applies line-item tax from the variant’s tax category + active tax zone.
 * If variants used "Reduced" or another category without CA-ON rates, Admin shows
 * "No configured tax rate" on products while shipping (which uses Standard in the
 * postal calculator) still shows tax.
 */
import {
  bootstrapWorker,
  Logger,
  ProductVariant,
  RequestContextService,
  TaxCategoryService,
  TransactionalConnection,
} from "@vendure/core";
import { config } from "./vendure-config";

async function seed() {
  const { app } = await bootstrapWorker(config);
  const connection = app.get(TransactionalConnection);
  const taxCategoryService = app.get(TaxCategoryService);
  const requestContextService = app.get(RequestContextService);
  const ctx = await requestContextService.create({ apiType: "admin" });

  const { items: categories } = await taxCategoryService.findAll(ctx, { take: 50 });
  const standard = categories.find((c: { name: string }) => c.name === "Standard");
  const fallback = categories.find((c: { isDefault?: boolean }) => c.isDefault);
  const target = standard ?? fallback;
  if (!target) {
    Logger.error(
      'No "Standard" (or default) tax category found. Run seed:canadian-tax or create Standard in Admin.'
    );
    await app.close();
    process.exit(1);
  }
  const standardId = (target as { id: string }).id;
  const label = standard ? "Standard" : "default tax category";
  Logger.info(`Using tax category "${label}" (id=${standardId}) for all variants.`);

  const repo = connection.getRepository(ctx, ProductVariant);
  // Assign Standard to every variant so order lines use the same category as provincial tax rates.
  const result = await repo
    .createQueryBuilder()
    .update(ProductVariant)
    .set({ taxCategory: { id: standardId } })
    .execute();

  Logger.info(
    `Updated ${result.affected ?? 0} product variant row(s) to use ${label}. Re-open or recalculate active orders in Admin if needed.`
  );

  await app.close();
}

if (require.main === module) {
  seed()
    .then(() => {
      Logger.info("seed-product-variant-standard-tax finished.");
      process.exit(0);
    })
    .catch((err) => {
      Logger.error(err);
      process.exit(1);
    });
}

export { seed };
