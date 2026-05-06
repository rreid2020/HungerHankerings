import type { OrderByCodeAccessStrategy, Order, RequestContext } from "@vendure/core";
/**
 * Like DefaultOrderByCodeAccessStrategy, but if `orderPlacedAt` is not set yet (common between
 * Stripe client confirm and server transitions), allow loading the order by code using
 * `createdAt` within the same time window and only for pre-fulfillment payment-related states.
 *
 * Time-window access must apply even when `ctx.activeUserId` is set (Bearer from a prior login).
 * Otherwise `orderByCode` throws Forbidden for the same shopper who just paid while logged in
 * but whose order customer record does not match that user (guest merge / session edge cases).
 */
export declare class RelaxedOrderByCodeAccessStrategy implements OrderByCodeAccessStrategy {
    private readonly windowMs;
    constructor(anonymousAccessDuration?: string);
    canAccessOrder(ctx: RequestContext, order: Order): boolean;
}
//# sourceMappingURL=relaxed-order-by-code-access-strategy.d.ts.map