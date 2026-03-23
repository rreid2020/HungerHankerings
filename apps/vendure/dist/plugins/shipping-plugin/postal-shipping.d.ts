import { Injector, ShippingCalculator, ShippingEligibilityChecker } from "@vendure/core";
/**
 * Eligibility: all orders with a shipping address and postal code are eligible.
 */
export declare const postalShippingEligibilityChecker: ShippingEligibilityChecker<{}>;
/**
 * Postal-code–based shipping calculator using seeded PostalCodeZone table.
 * Shipping price from DB by postal zone. The **tax rate** for shipping is resolved with
 * the same **Standard** tax category as product lines (see `getApplicableTaxRate` below),
 * so shipping tax matches provincial rates (CA-ON, CA-AB, etc.) from Settings → Tax rates.
 * (Vendure applies that rate via the calculator’s `taxRate`; shipping lines are not a separate
 * tax category in the Admin UI.)
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