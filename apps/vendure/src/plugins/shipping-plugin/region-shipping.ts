import {
  LanguageCode,
  ShippingCalculator,
  ShippingEligibilityChecker,
} from "@vendure/core";

/**
 * Eligibility: all orders with a shipping address are eligible.
 */
export const regionShippingEligibilityChecker = new ShippingEligibilityChecker({
  code: "region-shipping-eligibility",
  description: [
    { languageCode: LanguageCode.en, value: "Region-based shipping" },
  ],
  args: {},
  check: (_ctx, order) => {
    return !!order.shippingAddress?.postalCode;
  },
});

/**
 * Region-based shipping calculator.
 * Rules: Toronto (M prefix) → $10; Ontario → $15; Canada → $20;
 * Remote (NT, YT, NU) → $35; USA → $30. Prices in cents.
 */
const PRICE_TORONTO = 1000;
const PRICE_ONTARIO = 1500;
const PRICE_CANADA = 2000;
const PRICE_REMOTE = 3500;
const PRICE_USA = 3000;

const REMOTE_PROVINCES = new Set(["NT", "YT", "NU"]);
const ONTARIO_CODE = "ON";

export const regionShippingCalculator = new ShippingCalculator({
  code: "region-shipping-calculator",
  description: [
    {
      languageCode: LanguageCode.en,
      value: "Region-based rate (Toronto / Ontario / Canada / USA / Remote)",
    },
  ],
  args: {
    taxRate: {
      type: "int",
      ui: { component: "number-form-input", suffix: "%" },
      label: [{ languageCode: LanguageCode.en, value: "Tax rate" }],
    },
  },
  calculate: (ctx, order, args) => {
    const addr = order.shippingAddress;
    const countryCode = addr?.countryCode?.toUpperCase() ?? "";
    const province = addr?.province?.toUpperCase() ?? "";
    const postalCode = (addr?.postalCode ?? "").trim().toUpperCase();

    let priceCents: number;

    if (countryCode === "US") {
      priceCents = PRICE_USA;
    } else if (countryCode === "CA") {
      if (REMOTE_PROVINCES.has(province)) {
        priceCents = PRICE_REMOTE;
      } else if (province === ONTARIO_CODE) {
        if (postalCode.startsWith("M")) {
          priceCents = PRICE_TORONTO;
        } else {
          priceCents = PRICE_ONTARIO;
        }
      } else {
        priceCents = PRICE_CANADA;
      }
    } else {
      priceCents = PRICE_CANADA;
    }

    return {
      price: priceCents,
      priceIncludesTax: ctx.channel.pricesIncludeTax,
      taxRate: args.taxRate ?? 0,
      metadata: { region: countryCode === "US" ? "USA" : province || countryCode },
    };
  },
});
