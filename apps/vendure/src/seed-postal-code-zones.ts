/**
 * Seeds the PostalCodeZone table with country defaults only (3-char FSA lookup).
 * Run after schema exists: pnpm run build && pnpm run seed:postal-zones
 *
 * Creates CA (default) and US (default). Add rows for specific 3-char FSAs (e.g. K0K, M5V)
 * where you need a different rate (e.g. remote areas). Lookup: Canada = first 3 chars then default.
 */
import { bootstrapWorker, Logger, RequestContextService, TransactionalConnection } from "@vendure/core";
import { config } from "./vendure-config";
import { PostalCodeZone } from "./plugins/shipping-plugin/entities/postal-code-zone.entity";

const PLACEHOLDER_CA_CENTS = 1200; // $12
const PLACEHOLDER_US_CENTS = 1800; // $18

async function seed() {
  const { app } = await bootstrapWorker(config);
  const connection = app.get(TransactionalConnection);
  const requestContextService = app.get(RequestContextService);
  const ctx = await requestContextService.create({ apiType: "admin" });

  const repo = connection.getRepository(ctx, PostalCodeZone);
  const existing = await repo.find();
  const key = (z: PostalCodeZone) => `${z.countryCode}:${z.prefix}`;
  const existingKeys = new Set(existing.map(key));
  let added = 0;

  if (!existingKeys.has("CA:")) {
    await repo.save(
      repo.create({
        countryCode: "CA",
        prefix: "",
        zoneName: "Canada (default)",
        rateCents: PLACEHOLDER_CA_CENTS,
      })
    );
    existingKeys.add("CA:");
    added++;
  }

  if (!existingKeys.has("US:")) {
    await repo.save(
      repo.create({
        countryCode: "US",
        prefix: "",
        zoneName: "United States",
        rateCents: PLACEHOLDER_US_CENTS,
      })
    );
    added++;
  }

  Logger.info(`PostalCodeZone seed: ${added} row(s) added.`);
  await app.close();
}

if (require.main === module) {
  seed()
    .then(() => {
      Logger.info("Postal code zones seeded.");
      process.exit(0);
    })
    .catch((err) => {
      Logger.error(err);
      process.exit(1);
    });
}

export { seed };
