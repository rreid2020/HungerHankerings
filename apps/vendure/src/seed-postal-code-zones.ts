/**
 * Seeds the PostalCodeZone table with Canadian first-letter regions and US default.
 * Run after schema exists: pnpm run build && pnpm run seed:postal-zones
 *
 * Uses the standard Canada Post first-letter zones; placeholder rate $12 (1200 cents) for all.
 * Edit rates later in the database or add Admin UI.
 */
import { bootstrapWorker, Logger, RequestContextService, TransactionalConnection } from "@vendure/core";
import { config } from "./vendure-config";
import { PostalCodeZone } from "./plugins/shipping-plugin/entities/postal-code-zone.entity";

/** Canadian first letter → zone name (standard Canada Post). */
const CA_FIRST_LETTER_ZONES: Record<string, string> = {
  A: "Newfoundland & Labrador",
  B: "Nova Scotia",
  C: "Prince Edward Island",
  E: "New Brunswick",
  G: "Eastern Quebec",
  H: "Montreal Metro",
  J: "Western Quebec",
  K: "Eastern Ontario",
  L: "Central Ontario",
  M: "Toronto Metro",
  N: "Southwestern Ontario",
  P: "Northern Ontario",
  R: "Manitoba",
  S: "Saskatchewan",
  T: "Alberta",
  V: "British Columbia",
  X: "NWT & Nunavut",
  Y: "Yukon",
};

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

  for (const [prefix, zoneName] of Object.entries(CA_FIRST_LETTER_ZONES)) {
    if (existingKeys.has(`CA:${prefix}`)) {
      Logger.info(`PostalCodeZone CA:${prefix} already exists`);
      continue;
    }
    await repo.save(
      repo.create({
        countryCode: "CA",
        prefix,
        zoneName,
        rateCents: PLACEHOLDER_CA_CENTS,
      })
    );
    existingKeys.add(`CA:${prefix}`);
    added++;
  }

  if (!existingKeys.has("CA:")) {
    await repo.save(
      repo.create({
        countryCode: "CA",
        prefix: "",
        zoneName: "Canada (default)",
        rateCents: PLACEHOLDER_CA_CENTS,
      })
    );
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
