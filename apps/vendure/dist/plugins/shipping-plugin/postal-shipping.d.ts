import { Injector, ShippingCalculator, ShippingEligibilityChecker } from "@vendure/core";
/**
 * Eligibility: all orders with a shipping address and postal code are eligible.
 */
export declare const postalShippingEligibilityChecker: ShippingEligibilityChecker<{}>;
/**
 * Postal-code–based shipping calculator using seeded PostalCodeZone table.
 * Shipping price from DB by postal zone; tax on shipping uses the same provincial
 * rate as the order (from tax zones CA-ON, CA-AB, etc.).
 */
declare class PostalZoneShippingCalculator extends ShippingCalculator {
    private postalZoneService;
    private zoneService;
    private taxRateService;
    private taxCategoryService;
    constructor();
    init(injector: Injector): Promise<void>;
    private doCalculate;
}
export declare const postalShippingCalculator: PostalZoneShippingCalculator;
export {};
//# sourceMappingURL=postal-shipping.d.ts.map