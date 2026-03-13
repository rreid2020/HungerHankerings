/**
 * Seeds Canadian province zones and tax rates for province-based tax.
 * Run after migrations: pnpm run build && pnpm run seed:canadian-tax
 *
 * Creates zones CA-AB, CA-BC, ... CA-YT and "Canada" (fallback), each with
 * Canada as member, and a Standard tax rate per zone.
 */
import {
  bootstrapWorker,
  ChannelService,
  CountryService,
  Logger,
  RequestContextService,
  TaxCategoryService,
  TaxRateService,
  ZoneService,
} from "@vendure/core";
import { config } from "./vendure-config";

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
] as const;

/** Province zone code -> tax rate (percentage, e.g. 13 = 13% HST). */
const TAX_RATES: Record<string, number> = {
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
  const { app } = await bootstrapWorker(config);
  const zoneService = app.get(ZoneService);
  const countryService = app.get(CountryService);
  const taxRateService = app.get(TaxRateService);
  const taxCategoryService = app.get(TaxCategoryService);
  const channelService = app.get(ChannelService);
  const requestContextService = app.get(RequestContextService);

  const ctx = await requestContextService.create({ apiType: "admin" });

  // Ensure Canada is available and get its id (used as zone member)
  let canada: { id: string | number };
  try {
    canada = (await countryService.findOneByCode(ctx, "CA")) as { id: string | number };
  } catch (e) {
    Logger.error("Canada (CA) not found. Enable Canada in Settings → Countries first.");
    throw e;
  }
  const canadaId = canada.id;

  const existingZones = await zoneService.getAllWithMembers(ctx);
  const existingByName = new Map(existingZones.map((z) => [z.name, z]));

  const zoneIds: Record<string, string> = {};

  // Create province zones and fallback Canada zone
  for (const name of [...PROVINCE_ZONES, "Canada"]) {
    const existing = existingByName.get(name);
    if (existing) {
      zoneIds[name] = (existing as { id: string }).id;
      Logger.info(`Zone "${name}" already exists`);
      continue;
    }
    const zone = await zoneService.create(ctx, { name });
    zoneIds[name] = (zone as { id: string }).id;
    await zoneService.addMembersToZone(ctx, {
      zoneId: zoneIds[name],
      memberIds: [canadaId],
    });
    Logger.info(`Created zone "${name}" and added Canada`);
  }

  // Get or create default tax category (Standard)
  const { items: categories } = await taxCategoryService.findAll(ctx, { take: 20 });
  let standardCategory = categories.find(
    (c: { name: string; isDefault?: boolean }) =>
      c.name === "Standard" || (c as { isDefault?: boolean }).isDefault
  );
  if (!standardCategory) {
    standardCategory = await taxCategoryService.create(ctx, {
      name: "Standard",
      isDefault: true,
    });
    Logger.info("Created default tax category 'Standard'");
  }
  const categoryId = (standardCategory as { id: string }).id;

  // Create tax rate per zone
  const { items: rates } = await taxRateService.findAll(ctx, { take: 200 }, ["zone"]);
  const ratesByZoneId = new Set(
    (rates as { zone?: { id: string } }[]).map((r) => r.zone?.id).filter(Boolean) as string[]
  );

  for (const name of [...PROVINCE_ZONES, "Canada"]) {
    const zoneId = zoneIds[name];
    if (!zoneId) continue;
    if (ratesByZoneId.has(zoneId)) {
      Logger.info(`Tax rate for zone "${name}" already exists`);
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
    Logger.info(`Created tax rate for "${name}" at ${value}%`);
  }

  // Set channel default tax zone to "Canada" fallback so product list has a zone before address is set
  const { items: channels } = await channelService.findAll(ctx, { take: 1 });
  const defaultChannel = channels[0];
  if (defaultChannel && zoneIds["Canada"]) {
    await channelService.update(ctx, {
      id: (defaultChannel as { id: string }).id,
      defaultTaxZoneId: zoneIds["Canada"],
    });
    Logger.info("Set channel default tax zone to Canada");
  }

  await app.close();
}

if (require.main === module) {
  seed()
    .then(() => {
      Logger.info("Canadian tax zones and rates seeded successfully.");
      process.exit(0);
    })
    .catch((err) => {
      Logger.error(err);
      process.exit(1);
    });
}

export { seed };
