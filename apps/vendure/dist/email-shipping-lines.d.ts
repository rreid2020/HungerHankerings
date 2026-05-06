import type { Injector, Order, RequestContext } from "@vendure/core";
import type { PlainShippingLineForEmail } from "./email-plain-shipping-lines";
/**
 * Resolves shipping method labels for order emails without {@link EntityHydrator}.
 * The stock `hydrateShippingLines` helper merges hydrated relations into the live `Order` graph; when
 * `ShippingLine` ↔ `Order` forms a cycle, Vendure's `mergeDeep` can recurse until stack overflow.
 */
export declare function loadShippingLinesForEmailPlain(ctx: RequestContext, order: Order, injector: Injector): Promise<PlainShippingLineForEmail[]>;
//# sourceMappingURL=email-shipping-lines.d.ts.map