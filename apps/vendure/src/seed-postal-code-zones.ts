/**
 * Seeds the PostalCodeZone table with 3-char FSA lookup data.
 * Run after schema exists: pnpm run build && pnpm run seed:postal-zones
 *
 * There is no free Canadian API for FSA-based shipping rates. This seed:
 * - Generates all valid Canadian FSAs (format: letter + digit + letter; Canada Post uses 18 letters).
 * - Inserts one row per FSA with a default rate; you can edit specific FSAs (e.g. remote) at /shipping-rates.
 * - Also ensures CA (default) and US (default) exist.
 */
import { bootstrapWorker, Logger, RequestContextService, TransactionalConnection } from "@vendure/core";
import { config } from "./vendure-config";
import { PostalCodeZone } from "./plugins/shipping-plugin/entities/postal-code-zone.entity";

const DEFAULT_CA_CENTS = 1200; // $12 fallback when no FSA row or rate not set
const DEFAULT_US_CENTS = 1800; // $18
/** FSA rows start at 0; you add your own rate per zone at /shipping-rates. */
const FSA_INITIAL_RATE_CENTS = 0;

/** Letters used in Canadian postal codes (excludes D, F, I, O, Q, U, W, Z to avoid confusion). */
const CA_FSA_LETTERS = "ABCEGHJKLMNPRSTVXY";

function* allCanadianFsas(): Generator<string> {
  for (const a of CA_FSA_LETTERS) {
    for (let n = 0; n <= 9; n++) {
      for (const b of CA_FSA_LETTERS) {
        yield `${a}${n}${b}`;
      }
    }
  }
}

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
        rateCents: DEFAULT_CA_CENTS,
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
        rateCents: DEFAULT_US_CENTS,
      })
    );
    added++;
  }

  const BATCH = 200;
  let batch: Partial<PostalCodeZone>[] = [];
  for (const fsa of allCanadianFsas()) {
    if (existingKeys.has(`CA:${fsa}`)) continue;
    batch.push({
      countryCode: "CA",
      prefix: fsa,
      zoneName: `FSA ${fsa}`,
      city: null,
      region: null,
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
