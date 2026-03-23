import type { CreateCustomerInput } from "@vendure/common/lib/generated-shop-types";
import { DefaultGuestCheckoutStrategy, type DefaultGuestCheckoutStrategyOptions, type GuestCheckoutStrategy, Injector, Order, RequestContext } from "@vendure/core";
/**
 * Wraps {@link DefaultGuestCheckoutStrategy} so the active order always gets a real {@link Customer} id:
 *
 * 1. If the order already has `customerId`, return that customer (idempotent checkout retries).
 * 2. If the shopper is logged in (`ctx.activeUserId`), return their Customer instead of Vendure's
 *    `AlreadyLoggedInError` — the default strategy never links the cart in that case, which leaves
 *    Admin showing **Guest** and blocks `ArrangingPayment` (requires `order.customer`).
 * 3. Otherwise delegate: create/update guest customer from checkout input (unique Customer row per email).
 *
 * @see https://docs.vendure.io/current/core/reference/typescript-api/orders/guest-checkout-strategy
 */
export declare class LinkGuestCheckoutStrategy implements GuestCheckoutStrategy {
    private customerService;
    private readonly delegate;
    private readonly allowGuestCheckoutForRegisteredCustomers;
    constructor(options?: DefaultGuestCheckoutStrategyOptions);
    init(injector: Injector): void;
    setCustomerForOrder(ctx: RequestContext, order: Order, input: CreateCustomerInput): Promise<Awaited<ReturnType<DefaultGuestCheckoutStrategy["setCustomerForOrder"]>>>;
}
//# sourceMappingURL=link-guest-checkout-strategy.d.ts.map