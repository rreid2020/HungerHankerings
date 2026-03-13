import {
  Injector,
  LanguageCode,
  ShippingCalculator,
  ShippingEligibilityChecker,
} from "@vendure/core";
import { PostalCodeZoneService } from "./postal-code-zone.service";

/**
 * Eligibility: all orders with a shipping address and postal code are eligible.
 */
export const postalShippingEligibilityChecker = new ShippingEligibilityChecker({
  code: "postal-shipping-eligibility",
  description: [
    { languageCode: LanguageCode.en, value: "Postal code shipping" },
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
class PostalZoneShippingCalculator extends ShippingCalculator {
  private postalZoneService!: PostalCodeZoneService;

  constructor() {
    super({
      code: "postal-shipping-calculator",
      description: [
        {
          languageCode: LanguageCode.en,
          value: "Postal code zone rate (Canada first letter, US default)",
        },
      ],
      args: {
        taxRate: {
          type: "int",
          ui: { component: "number-form-input", suffix: "%" },
          label: [{ languageCode: LanguageCode.en, value: "Tax rate" }],
        },
      },
      calculate: function (this: PostalZoneShippingCalculator, ctx: any, order: any, args: { taxRate?: number }) {
        return this.doCalculate(ctx, order, args);
      },
    });
  }

  async init(injector: Injector): Promise<void> {
    this.postalZoneService = injector.get(PostalCodeZoneService);
  }

  private async doCalculate(ctx: any, order: any, args: { taxRate?: number }) {
    const addr = order.shippingAddress;
    const countryCode = (addr?.countryCode ?? "").trim().toUpperCase();
    const postalCode = (addr?.postalCode ?? "").trim().toUpperCase().replace(/\s/g, "");

    const prefix = countryCode === "CA" ? postalCode.slice(0, 1) : "";
    const rateCents =
      (await this.postalZoneService.getRateCents(ctx, countryCode, prefix)) ??
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

export const postalShippingCalculator = new PostalZoneShippingCalculator();
