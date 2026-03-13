"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postalShippingCalculator = exports.postalShippingEligibilityChecker = void 0;
const core_1 = require("@vendure/core");
const postal_code_zone_service_1 = require("./postal-code-zone.service");
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
 * Canadian first letter = zone; US = country default. Rates from DB.
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
            args: {
                taxRate: {
                    type: "int",
                    ui: { component: "number-form-input", suffix: "%" },
                    label: [{ languageCode: core_1.LanguageCode.en, value: "Tax rate" }],
                },
            },
            calculate: function (ctx, order, args) {
                return this.doCalculate(ctx, order, args);
            },
        });
    }
    async init(injector) {
        this.postalZoneService = injector.get(postal_code_zone_service_1.PostalCodeZoneService);
    }
    async doCalculate(ctx, order, args) {
        const addr = order.shippingAddress;
        const countryCode = (addr?.countryCode ?? "").trim().toUpperCase();
        const postalCode = (addr?.postalCode ?? "").trim().toUpperCase().replace(/\s/g, "");
        const prefix = countryCode === "CA" ? postalCode.slice(0, 1) : "";
        const rateCents = (await this.postalZoneService.getRateCents(ctx, countryCode, prefix)) ??
            FALLBACK_RATE_CENTS;
        return {
            price: rateCents,
            priceIncludesTax: ctx.channel.pricesIncludeTax,
            taxRate: args.taxRate ?? 0,
            metadata: {
                postalPrefix: countryCode === "CA" ? prefix || undefined : undefined,
                countryCode,
            },
        };
    }
}
exports.postalShippingCalculator = new PostalZoneShippingCalculator();
