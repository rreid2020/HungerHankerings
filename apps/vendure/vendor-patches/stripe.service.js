"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key, r)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const core_2 = require("@vendure/core");
const constants_1 = require("./constants");
const metadata_sanitize_1 = require("./metadata-sanitize");
const stripe_client_1 = require("./stripe-client");
const stripe_utils_1 = require("./stripe-utils");
const stripe_handler_1 = require("./stripe.handler");
/** True when Stripe rejects a customer id (wrong account, test/live mismatch, deleted in Stripe). */
function isStaleCustomerError(e) {
    if (e == null || typeof e !== "object")
        return false;
    const err = e;
    const code = err.code || (err.raw && err.raw.code);
    const msg = String(err.message || (err.raw && err.raw.message) || "");
    if (code === "resource_missing")
        return true;
    if (/no such customer/i.test(msg))
        return true;
    return false;
}
let StripeService = exports.StripeService = class StripeService {
    constructor(options, connection, paymentMethodService, moduleRef) {
        this.options = options;
        this.connection = connection;
        this.paymentMethodService = paymentMethodService;
        this.moduleRef = moduleRef;
    }
    async createPaymentIntent(ctx, order) {
        var _a, _b, _c;
        let customerId;
        const stripe = await this.getStripeClient(ctx, order);
        if (this.options.storeCustomersInStripe && ctx.activeUserId) {
            customerId = await this.getStripeCustomerId(ctx, order);
        }
        const amountInMinorUnits = (0, stripe_utils_1.getAmountInStripeMinorUnits)(order);
        const additionalParams = await ((_b = (_a = this.options).paymentIntentCreateParams) === null || _b === void 0 ? void 0 : _b.call(_a, new core_2.Injector(this.moduleRef), ctx, order));
        const metadata = (0, metadata_sanitize_1.sanitizeMetadata)(Object.assign(Object.assign({}, (typeof this.options.metadata === 'function'
            ? await this.options.metadata(new core_2.Injector(this.moduleRef), ctx, order)
            : {})), { channelToken: ctx.channel.token, orderId: order.id, orderCode: order.code }));
        const allMetadata = Object.assign(Object.assign({}, metadata), (0, metadata_sanitize_1.sanitizeMetadata)((_c = additionalParams === null || additionalParams === void 0 ? void 0 : additionalParams.metadata) !== null && _c !== void 0 ? _c : {}));
        const doCreate = async (cid, idemSuffix) => {
            const { client_secret } = await stripe.paymentIntents.create(Object.assign(Object.assign({ amount: amountInMinorUnits, currency: order.currencyCode.toLowerCase(), customer: cid, automatic_payment_methods: {
                    enabled: true,
                } }, (additionalParams !== null && additionalParams !== void 0 ? additionalParams : {})), { metadata: allMetadata }), { idempotencyKey: `${order.code}_${amountInMinorUnits}${idemSuffix}` });
            return client_secret;
        };
        try {
            const client_secret = await doCreate(customerId, "");
            if (!client_secret) {
                core_2.Logger.warn(`Payment intent creation for order ${order.code} did not return client secret`, constants_1.loggerCtx);
                throw Error('Failed to create payment intent');
            }
            return client_secret !== null && client_secret !== void 0 ? client_secret : undefined;
        }
        catch (e) {
            if (this.options.storeCustomersInStripe && ctx.activeUserId && customerId && isStaleCustomerError(e)) {
                core_2.Logger.warn(`PaymentIntent failed (${e instanceof Error ? e.message : String(e)}); clearing stored Stripe customer id and retrying once for order ${order.code}`, constants_1.loggerCtx);
                await this.clearStoredStripeCustomerId(ctx, order);
                customerId = await this.getStripeCustomerId(ctx, order);
                const client_secret = await doCreate(customerId, "_recover");
                if (!client_secret) {
                    core_2.Logger.warn(`Payment intent creation for order ${order.code} did not return client secret`, constants_1.loggerCtx);
                    throw Error('Failed to create payment intent');
                }
                return client_secret !== null && client_secret !== void 0 ? client_secret : undefined;
            }
            throw e;
        }
    }
    async constructEventFromPayload(ctx, order, payload, signature) {
        const stripe = await this.getStripeClient(ctx, order);
        return stripe.webhooks.constructEvent(payload, signature, stripe.webhookSecret);
    }
    async createRefund(ctx, order, payment, amount) {
        const stripe = await this.getStripeClient(ctx, order);
        return stripe.refunds.create({
            payment_intent: payment.transactionId,
            amount,
        });
    }
    /**
     * Get Stripe client based on eligible payment methods for order
     */
    async getStripeClient(ctx, order) {
        const [eligiblePaymentMethods, paymentMethods] = await Promise.all([
            this.paymentMethodService.getEligiblePaymentMethods(ctx, order),
            this.paymentMethodService.findAll(ctx, {
                filter: {
                    enabled: { eq: true },
                },
            }),
        ]);
        const stripePaymentMethod = paymentMethods.items.find(pm => pm.handler.code === stripe_handler_1.stripePaymentMethodHandler.code);
        if (!stripePaymentMethod) {
            throw new core_2.UserInputError('No enabled Stripe payment method found');
        }
        const isEligible = eligiblePaymentMethods.some(pm => pm.code === stripePaymentMethod.code);
        if (!isEligible) {
            throw new core_2.UserInputError(`Stripe payment method is not eligible for order ${order.code}`);
        }
        const apiKey = this.findOrThrowArgValue(stripePaymentMethod.handler.args, 'apiKey');
        const webhookSecret = this.findOrThrowArgValue(stripePaymentMethod.handler.args, 'webhookSecret');
        return new stripe_client_1.VendureStripeClient(apiKey, webhookSecret);
    }
    findOrThrowArgValue(args, name) {
        var _a;
        const value = (_a = args.find(arg => arg.name === name)) === null || _a === void 0 ? void 0 : _a.value;
        if (!value) {
            throw Error(`No argument named '${name}' found!`);
        }
        return value;
    }
    async clearStoredStripeCustomerId(ctx, activeOrder) {
        const order = await this.connection.getRepository(ctx, core_2.Order).findOne({
            where: { id: activeOrder.id },
            relations: ['customer'],
        });
        if (!(order === null || order === void 0 ? void 0 : order.customer))
            return;
        order.customer.customFields.stripeCustomerId = null;
        await this.connection.getRepository(ctx, core_2.Customer).save(order.customer, { reload: false });
    }
    /**
     * Returns the stripeCustomerId if the Customer has one. If that's not the case, queries Stripe to check
     * if the customer is already registered, in which case it saves the id as stripeCustomerId and returns it.
     * Otherwise, creates a new Customer record in Stripe and returns the generated id.
     */
    async getStripeCustomerId(ctx, activeOrder) {
        var _a, _b;
        const [stripe, order] = await Promise.all([
            this.getStripeClient(ctx, activeOrder),
            this.connection.getRepository(ctx, core_2.Order).findOne({
                where: { id: activeOrder.id },
                relations: ['customer'],
            }),
        ]);
        if (!order || !order.customer) {
            return undefined;
        }
        const { customer } = order;
        if (customer.customFields.stripeCustomerId) {
            const storedId = customer.customFields.stripeCustomerId;
            try {
                await stripe.customers.retrieve(storedId);
                return storedId;
            }
            catch (e) {
                if (!isStaleCustomerError(e)) {
                    throw e;
                }
                core_2.Logger.warn(`Stripe customer id "${storedId}" was not found in Stripe (deleted customer, test/live key mismatch, or different Stripe account). Clearing stored id for Vendure customer ${customer.id}.`, constants_1.loggerCtx);
                customer.customFields.stripeCustomerId = null;
                await this.connection.getRepository(ctx, core_2.Customer).save(customer, { reload: false });
            }
        }
        let stripeCustomerId;
        const stripeCustomers = await stripe.customers.list({ email: customer.emailAddress });
        if (stripeCustomers.data.length > 0) {
            stripeCustomerId = stripeCustomers.data[0].id;
        }
        else {
            const additionalParams = await ((_b = (_a = this.options).customerCreateParams) === null || _b === void 0 ? void 0 : _b.call(_a, new core_2.Injector(this.moduleRef), ctx, order));
            const newStripeCustomer = await stripe.customers.create(Object.assign(Object.assign({ email: customer.emailAddress, name: `${customer.firstName} ${customer.lastName}` }, (additionalParams !== null && additionalParams !== void 0 ? additionalParams : {})), ((additionalParams === null || additionalParams === void 0 ? void 0 : additionalParams.metadata)
                ? { metadata: (0, metadata_sanitize_1.sanitizeMetadata)(additionalParams.metadata) }
                : {})));
            stripeCustomerId = newStripeCustomer.id;
            core_2.Logger.info(`Created Stripe Customer record for customerId ${customer.id}`, constants_1.loggerCtx);
        }
        customer.customFields.stripeCustomerId = stripeCustomerId;
        await this.connection.getRepository(ctx, core_2.Customer).save(customer, { reload: false });
        return stripeCustomerId;
    }
};
exports.StripeService = StripeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(constants_1.STRIPE_PLUGIN_OPTIONS)),
    __metadata("design:paramtypes", [Object, core_2.TransactionalConnection,
        core_2.PaymentMethodService,
        core_1.ModuleRef])
], StripeService);
//# sourceMappingURL=stripe.service.js.map
