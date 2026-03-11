import { LanguageCode, ShippingCalculator, ShippingEligibilityChecker } from "@vendure/core";
/**
 * Eligibility: all orders with a shipping address are eligible.
 */
export declare const regionShippingEligibilityChecker: ShippingEligibilityChecker<{}>;
export declare const regionShippingCalculator: ShippingCalculator<{
    taxRate: {
        type: "int";
        ui: {
            component: string;
            suffix: string;
        };
        label: {
            languageCode: LanguageCode.en;
            value: string;
        }[];
    };
}>;
//# sourceMappingURL=region-shipping.d.ts.map