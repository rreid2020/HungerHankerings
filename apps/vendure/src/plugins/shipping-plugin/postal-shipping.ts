import {
  Injector,
  LanguageCode,
  Logger,
  ShippingCalculator,
  ShippingEligibilityChecker,
  TaxCategoryService,
  TaxRateService,
  ZoneService,
} from "@vendure/core";
import { PostalCodeZoneService } from "./postal-code-zone.service";

const loggerCtx = "PostalZoneShipping";

/** Province name or code -> 2-letter code (matches tax zone strategy). */
const PROVINCE_TO_CODE: Record<string, string> = {
  Alberta: "AB",
  "British Columbia": "BC",
  Manitoba: "MB",
  "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL",
  "Newfoundland & Labrador": "NL",
  "Nova Scotia": "NS",
  "Northwest Territories": "NT",
  Nunavut: "NU",
  Ontario: "ON",
  "Prince Edward Island": "PE",
  Quebec: "QC",
  Saskatchewan: "SK",
  Yukon: "YT",
  AB: "AB",
  BC: "BC",
  MB: "MB",
  NB: "NB",
  NL: "NL",
  NS: "NS",
  NT: "NT",
  NU: "NU",
  ON: "ON",
  PE: "PE",
  QC: "QC",
  SK: "SK",
  YT: "YT",
};

function normalizeProvince(province: string | null | undefined): string {
  if (!province || typeof province !== "string") return "";
  const t = province.trim();
  if (t.length === 2) return t.toUpperCase();
  return (
    PROVINCE_TO_CODE[t] ?? PROVINCE_TO_CODE[t.replace(/\s+and\s+/gi, " & ")]
  )?.toUpperCase() ?? t.slice(0, 2).toUpperCase();
}

/**
 * Eligibility: all orders with a shipping address and postal code are eligible.
 */
export const postalShippingEligibilityChecker = new ShippingEligibilityChecker({
  code: "postal-shipping-eligibility",
  description: [{ languageCode: LanguageCode.en, value: "Postal code shipping" }],
  args: {},
  check: (_ctx, order) => {
    return !!order.shippingAddress?.postalCode?.trim();
  },
});

/** Emergency only — prefer ops admin DB zone rates. $12 matches legacy PostalCodeZone CA default. */
const FALLBACK_RATE_CENTS = 1200;

/**
 * Postal-code–based shipping calculator using ops `hungerhankeringsadmin` shipping tables first.
 * Tax rate uses the same **Standard** category as product lines (provincial zones CA-ON, etc.).
 */
class PostalZoneShippingCalculator extends ShippingCalculator {
  private postalZoneService!: PostalCodeZoneService;
  private zoneService!: ZoneService;
  private taxRateService!: TaxRateService;
  private taxCategoryService!: TaxCategoryService;

  constructor() {
    super({
      code: "postal-shipping-calculator",
      description: [
        {
          languageCode: LanguageCode.en,
          value: "Postal code zone rate (ops shipping zones; Canada FSA / US default)",
        },
      ],
      args: {},
      calculate: function (this: PostalZoneShippingCalculator, ctx: any, order: any) {
        return this.doCalculate(ctx, order);
      },
    });
  }

  async init(injector: Injector): Promise<void> {
    this.postalZoneService = injector.get(PostalCodeZoneService);
    this.zoneService = injector.get(ZoneService);
    this.taxRateService = injector.get(TaxRateService);
    this.taxCategoryService = injector.get(TaxCategoryService);
  }

  private async resolveRateCents(
    ctx: any,
    effectiveCountry: string,
    postalCode: string,
    orderSubtotalCents: number,
  ): Promise<{
    rateCents: number;
    adminRate: Awaited<ReturnType<PostalCodeZoneService["getAdminRateCentsByPostal"]>>;
    source: "admin" | "legacy" | "fallback";
    adminError?: string;
  }> {
    let adminRate: Awaited<ReturnType<PostalCodeZoneService["getAdminRateCentsByPostal"]>> = null;
    let adminError: string | undefined;
    try {
      adminRate = await this.postalZoneService.getAdminRateCentsByPostal(
        effectiveCountry,
        postalCode,
        orderSubtotalCents,
      );
    } catch (err) {
      adminError = err instanceof Error ? err.message : String(err);
      Logger.warn(
        `Admin shipping DB lookup failed for ${effectiveCountry} ${postalCode}: ${adminError}`,
        loggerCtx,
      );
    }

    if (adminRate && typeof adminRate.rateCents === "number") {
      return { rateCents: adminRate.rateCents, adminRate, source: "admin" };
    }

    let legacy: number | null = null;
    try {
      legacy = await this.postalZoneService.getRateCentsByPostal(ctx, effectiveCountry, postalCode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.warn(`Legacy PostalCodeZone lookup failed: ${msg}`, loggerCtx);
    }

    if (legacy != null && legacy > 0) {
      Logger.warn(
        `Using legacy PostalCodeZone rate ${legacy}¢ for ${effectiveCountry} ${postalCode} (admin miss${adminError ? `: ${adminError}` : ""}).`,
        loggerCtx,
      );
      return { rateCents: legacy, adminRate: null, source: "legacy", adminError };
    }

    Logger.warn(
      `Using hard-coded fallback ${FALLBACK_RATE_CENTS}¢ for ${effectiveCountry} ${postalCode} (admin miss${adminError ? `: ${adminError}` : ""}).`,
      loggerCtx,
    );
    return { rateCents: FALLBACK_RATE_CENTS, adminRate: null, source: "fallback", adminError };
  }

  private async resolveShippingTaxRate(ctx: any, effectiveCountry: string, provinceRaw: string | null | undefined): Promise<number> {
    if (effectiveCountry !== "CA") return 0;
    try {
      const provinceCode = normalizeProvince(provinceRaw);
      const zoneName = provinceCode ? `CA-${provinceCode}` : "Canada";
      const zones = await this.zoneService.getAllWithMembers(ctx);
      const zone = zones.find((z) => z.name === zoneName) ?? zones.find((z) => z.name === "Canada");
      if (!zone) return 0;
      const { items: categories } = await this.taxCategoryService.findAll(ctx, { take: 20 });
      const defaultCategory =
        categories.find((c: { name?: string }) => c.name === "Standard") ??
        categories.find((c: { isDefault?: boolean }) => c.isDefault);
      if (!defaultCategory) return 0;
      const applicable = await this.taxRateService.getApplicableTaxRate(ctx, zone, defaultCategory);
      if (applicable?.value != null) return Number(applicable.value);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.warn(`Shipping tax rate lookup failed (price still applied): ${msg}`, loggerCtx);
    }
    return 0;
  }

  private async doCalculate(ctx: any, order: any) {
    const addr = order.shippingAddress;
    const countryCode = (addr?.countryCode ?? "").trim().toUpperCase();
    const postalCode = (addr?.postalCode ?? "").trim().toUpperCase().replace(/\s/g, "");

    // If postal looks Canadian (e.g. K1C 7E9) but country missing, assume CA so zone lookup works
    const effectiveCountry =
      countryCode || (postalCode.match(/^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i) ? "CA" : "");

    // Free-shipping thresholds in ops are dollar amounts; Vendure Order.subTotal is minor units.
    const orderSubtotalCents = Number(order?.subTotal ?? 0) || 0;

    const { rateCents, adminRate, source, adminError } = await this.resolveRateCents(
      ctx,
      effectiveCountry,
      postalCode,
      orderSubtotalCents,
    );

    const taxRate = await this.resolveShippingTaxRate(ctx, effectiveCountry, addr?.province);

    const prefix = effectiveCountry === "CA" ? postalCode.slice(0, 3) : "";
    return {
      price: rateCents,
      priceIncludesTax: ctx.channel?.pricesIncludeTax ?? false,
      taxRate,
      metadata: {
        postalPrefix: adminRate?.postalPrefix || prefix || undefined,
        countryCode: effectiveCountry || undefined,
        shippingZoneCode: adminRate?.zoneCode,
        shippingZoneName: adminRate?.zoneName,
        fallbackUsed: adminRate?.fallbackUsed ?? source !== "admin",
        overrideUsed: adminRate?.overrideUsed,
        rateSource: source,
        ...(adminError ? { adminError } : {}),
      },
    };
  }
}

export const postalShippingCalculator = new PostalZoneShippingCalculator();
