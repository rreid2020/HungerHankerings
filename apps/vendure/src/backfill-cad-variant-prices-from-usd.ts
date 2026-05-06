/**
 * After switching the default channel from USD → CAD, variants that only have USD
 * `ProductVariantPrice` rows cause Admin (and Shop) GraphQL to error:
 * "No price information was found for ProductVariant ID … in the Channel …".
 * That blocks editing product options until CAD prices exist.
 *
 * This script clones each **USD** price row to **CAD** for the same variant + channel,
 * using the **same minor-unit amount** (not a FX conversion — adjust manually if needed).
 *
 * Run against production DB (same env as Vendure):
 *   cd apps/vendure && npm run build && npm run backfill:cad-prices-from-usd
 *
 * Or from the container: `node dist/backfill-cad-variant-prices-from-usd.js`
 */
import {
  bootstrapWorker,
  CurrencyCode,
  Logger,
  ProductVariantPrice,
  RequestContextService,
  TransactionalConnection,
} from "@vendure/core";
import { config } from "./vendure-config";

async function run(): Promise<void> {
  const source = (process.env.BACKFILL_PRICE_SOURCE_CURRENCY?.trim().toUpperCase() || "USD") as CurrencyCode;
  const target = (process.env.BACKFILL_PRICE_TARGET_CURRENCY?.trim().toUpperCase() || "CAD") as CurrencyCode;

  const { app } = await bootstrapWorker(config);
  const connection = app.get(TransactionalConnection);
  const requestContextService = app.get(RequestContextService);
  const ctx = await requestContextService.create({ apiType: "admin" });

  const repo = connection.getRepository(ctx, ProductVariantPrice);

  const usdPrices = await repo
    .createQueryBuilder("pvp")
    .leftJoinAndSelect("pvp.variant", "variant")
    .where("UPPER(pvp.currencyCode) = UPPER(:src)", { src: source })
    .getMany();

  let inserted = 0;
  let skipped = 0;

  for (const row of usdPrices) {
    const variantId = row.variant?.id;
    if (!variantId) {
      Logger.warn(`Skipping price row ${row.id}: missing variant relation`);
      skipped++;
      continue;
    }

    const exists = await repo
      .createQueryBuilder("pvp")
      .where("pvp.variantId = :vid", { vid: variantId })
      .andWhere("pvp.channelId = :cid", { cid: row.channelId })
      .andWhere("UPPER(pvp.currencyCode) = UPPER(:tgt)", { tgt: target })
      .getOne();
    if (exists) {
      skipped++;
      continue;
    }

    const created = repo.create({
      price: row.price,
      channelId: row.channelId,
      currencyCode: target,
      variant: { id: variantId },
    });
    await repo.save(created);
    inserted++;
  }

  Logger.info(
    `backfill-cad-variant-prices-from-usd: cloned ${inserted} row(s) (${source} → ${target}); skipped ${skipped} (already present or no variant).`,
  );

  await app.close();
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      Logger.error(err);
      process.exit(1);
    });
}

export { run };
