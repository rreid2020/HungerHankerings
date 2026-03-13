import { Injector, ShippingCalculator, ShippingEligibilityChecker } from "@vendure/core";
/**
 * Eligibility: all orders with a shipping address and postal code are eligible.
 */
export declare const postalShippingEligibilityChecker: ShippingEligibilityChecker<{}>;
/**
 * Postal-code–based shipping calculator using seeded PostalCodeZone table.
 * Canadian first letter = zone; US = country default. Rates from DB.
 */
declare class PostalZoneShippingCalculator extends ShippingCalculator {
    private postalZoneService;
    constructor();
    init(injector: Injector): Promise<void>;
    private doCalculate;
}
export declare const postalShippingCalculator: PostalZoneShippingCalculator;
export {};
//# sourceMappingURL=postal-shipping.d.ts.map