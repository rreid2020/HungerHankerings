import {
  CustomerService,
  DefaultGuestCheckoutStrategy,
  type DefaultGuestCheckoutStrategyOptions,
  type GuestCheckoutStrategy,
  Injector,
  Order,
  RequestContext,
} from "@vendure/core";

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
export class LinkGuestCheckoutStrategy implements GuestCheckoutStrategy {
  private customerService!: CustomerService;
  private readonly delegate: DefaultGuestCheckoutStrategy;
  /** Same flag as {@link DefaultGuestCheckoutStrategy} — used for createOrUpdate when not delegating. */
  private readonly allowGuestCheckoutForRegisteredCustomers: boolean;

  constructor(options?: DefaultGuestCheckoutStrategyOptions) {
    this.delegate = new DefaultGuestCheckoutStrategy(options);
    this.allowGuestCheckoutForRegisteredCustomers =
      options?.allowGuestCheckoutForRegisteredCustomers ?? false;
  }

  init(injector: Injector): void {
    this.customerService = injector.get(CustomerService);
    this.delegate.init(injector);
  }

  async setCustomerForOrder(
    ctx: RequestContext,
    order: Order,
    input: Parameters<GuestCheckoutStrategy["setCustomerForOrder"]>[2]
  ): Promise<Awaited<ReturnType<DefaultGuestCheckoutStrategy["setCustomerForOrder"]>>> {
    if (order.customerId) {
      const existing =
        order.customer ?? (await this.customerService.findOne(ctx, order.customerId));
      if (existing) {
        return existing;
      }
    }

    if (ctx.activeUserId) {
      // Default findOneByUserId uses filterOnChannel=true; customers not assigned to the current
      // channel would not be found, then we'd delegate and hit AlreadyLoggedInError with no link.
      const forUser = await this.customerService.findOneByUserId(ctx, ctx.activeUserId, false);
      if (forUser) {
        return forUser;
      }
      // Logged in but no Customer row (rare). Cannot delegate — DefaultGuestCheckoutStrategy returns
      // AlreadyLoggedInError when activeUserId is set. Create/update from checkout input instead.
      const errorOnExistingUser = !this.allowGuestCheckoutForRegisteredCustomers;
      return this.customerService.createOrUpdate(ctx, input, errorOnExistingUser);
    }

    return this.delegate.setCustomerForOrder(ctx, order, input);
  }
}
