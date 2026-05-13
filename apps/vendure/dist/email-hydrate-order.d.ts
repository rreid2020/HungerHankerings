import type { Injector, Order, RequestContext } from "@vendure/core";
/**
 * Ensures relations needed for {@link Order.taxSummary}, line display names, assets, and shipping labels.
 * Nested `*.taxLines` paths are valid at runtime; generated relation paths omit some TaxLine joins.
 */
export declare function hydrateOrderForEmail(ctx: RequestContext, order: Order, injector: Injector): Promise<void>;
//# sourceMappingURL=email-hydrate-order.d.ts.map