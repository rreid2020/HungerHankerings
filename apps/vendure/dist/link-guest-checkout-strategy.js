"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkGuestCheckoutStrategy = void 0;
const core_1 = require("@vendure/core");
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
class LinkGuestCheckoutStrategy {
    constructor(options) {
        this.delegate = new core_1.DefaultGuestCheckoutStrategy(options);
        this.allowGuestCheckoutForRegisteredCustomers =
            (options === null || options === void 0 ? void 0 : options.allowGuestCheckoutForRegisteredCustomers) ?? false;
    }
    init(injector) {
        this.customerService = injector.get(core_1.CustomerService);
        this.delegate.init(injector);
    }
    async setCustomerForOrder(ctx, order, input) {
        if (order.customerId) {
            const existing = order.customer ?? (await this.customerService.findOne(ctx, order.customerId));
            if (existing) {
                return existing;
            }
        }
        if (ctx.activeUserId) {
            const forUser = await this.customerService.findOneByUserId(ctx, ctx.activeUserId, false);
            if (forUser) {
                return forUser;
            }
            const errorOnExistingUser = !this.allowGuestCheckoutForRegisteredCustomers;
            return this.customerService.createOrUpdate(ctx, input, errorOnExistingUser);
        }
        return this.delegate.setCustomerForOrder(ctx, order, input);
    }
}
exports.LinkGuestCheckoutStrategy = LinkGuestCheckoutStrategy;
