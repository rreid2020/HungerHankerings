"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postalShippingCalculator = exports.postalShippingEligibilityChecker = void 0;
const core_1 = require("@vendure/core");
const postal_code_zone_service_1 = require("./postal-code-zone.service");
/** Province name or code -> 2-letter code (matches tax zone strategy). */
const PROVINCE_TO_CODE = {
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
    AB: "AB", BC: "BC", MB: "MB", NB: "NB", NL: "NL", NS: "NS",
    NT: "NT", NU: "NU", ON: "ON", PE: "PE", QC: "QC", SK: "SK", YT: "YT",
};
function normalizeProvince(province) {
    if (!province || typeof province !== "string")
        return "";
    const t = province.trim();
    if (t.length === 2)
        return t.toUpperCase();
    return (PROVINCE_TO_CODE[t] ?? PROVINCE_TO_CODE[t.replace(/\s+and\s+/gi, " & ")])?.toUpperCase() ?? t.slice(0, 2).toUpperCase();
}
/**
 * Eligibility: all orders with a shipping address and postal code are eligible.
 */
exports.postalShippingEligibilityChecker = new core_1.ShippingEligibilityChecker({
    code: "postal-shipping-eligibility",
    description: [
        { languageCode: core_1.LanguageCode.en, value: "Postal code shipping" },
    ],
    args: {},
    check: (_ctx, order) => {
        return !!order.shippingAddress?.postalCode?.trim();
    },
});
const FALLBACK_RATE_CENTS = 1200; // $12 if no zone found
/**
 * Postal-code–based shipping calculator using seeded PostalCodeZone table.
 * Shipping price from DB by postal zone. The **tax rate** for shipping is resolved with
 * the same **Standard** tax category as product lines (see `getApplicableTaxRate` below),
 * so shipping tax matches provincial rates (CA-ON, CA-AB, etc.) from Settings → Tax rates.
 * (Vendure applies that rate via the calculator’s `taxRate`; shipping lines are not a separate
 * tax category in the Admin UI.)
 */
class PostalZoneShippingCalculator extends core_1.ShippingCalculator {
    constructor() {
        super({
            code: "postal-shipping-calculator",
            description: [
                {
                    languageCode: core_1.LanguageCode.en,
                    value: "Postal code zone rate (Canada first letter, US default)",
                },
            ],
            args: {},
            calculate: function (ctx, order) {
                return this.doCalculate(ctx, order);
            },
        });
    }
    async init(injector) {
        this.postalZoneService = injector.get(postal_code_zone_service_1.PostalCodeZoneService);
        this.zoneService = injector.get(core_1.ZoneService);
        this.taxRateService = injector.get(core_1.TaxRateService);
        this.taxCategoryService = injector.get(core_1.TaxCategoryService);
    }
    async doCalculate(ctx, order) {
        try {
            const addr = order.shippingAddress;
            const countryCode = (addr?.countryCode ?? "").trim().toUpperCase();
            const postalCode = (addr?.postalCode ?? "").trim().toUpperCase().replace(/\s/g, "");
            // If postal looks Canadian (e.g. K1C 7E9) but country missing, assume CA so zone lookup works
            const effectiveCountry = countryCode || (postalCode.match(/^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i) ? "CA" : "");
            const orderSubtotalCents = Number(order?.subTotal ?? order?.subTotalWithTax ?? 0) || 0;
            const adminRate = await this.postalZoneService.getAdminRateCentsByPostal(effectiveCountry, postalCode, orderSubtotalCents);
            const rateCents = adminRate?.rateCents ??
                (await this.postalZoneService.getRateCentsByPostal(ctx, effectiveCountry, postalCode)) ??
                FALLBACK_RATE_CENTS;
            let taxRate = 0;
            if (effectiveCountry === "CA") {
                const provinceCode = normalizeProvince(addr?.province);
                const zoneName = provinceCode ? `CA-${provinceCode}` : "Canada";
                const zones = await this.zoneService.getAllWithMembers(ctx);
                const zone = zones.find((z) => z.name === zoneName) ?? zones.find((z) => z.name === "Canada");
                if (zone) {
                    const { items: categories } = await this.taxCategoryService.findAll(ctx, { take: 20 });
                    // Prefer **Standard** so shipping uses the same tax category as product variants.
                    const defaultCategory = categories.find((c) => c.name === "Standard") ??
                        categories.find((c) => c.isDefault);
                    if (defaultCategory) {
                        const applicable = await this.taxRateService.getApplicableTaxRate(ctx, zone, defaultCategory);
                        if (applicable?.value != null)
                            taxRate = Number(applicable.value);
                    }
                }
            }
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
                    fallbackUsed: adminRate?.fallbackUsed,
                    overrideUsed: adminRate?.overrideUsed,
                },
            };
        }
        catch (err) {
            // Avoid breaking Admin "Test shipping method" or checkout; return fallback
            return {
                price: FALLBACK_RATE_CENTS,
                priceIncludesTax: ctx.channel?.pricesIncludeTax ?? false,
                taxRate: 0,
                metadata: { error: err instanceof Error ? err.message : "Shipping calculation failed" },
            };
        }
    }
}
exports.postalShippingCalculator = new PostalZoneShippingCalculator();
