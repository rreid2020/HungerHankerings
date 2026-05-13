"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hydrateOrderForEmail = hydrateOrderForEmail;
const core_1 = require("@vendure/core");
/**
 * Ensures relations needed for {@link Order.taxSummary}, line display names, assets, and shipping labels.
 * Nested `*.taxLines` paths are valid at runtime; generated relation paths omit some TaxLine joins.
 */
async function hydrateOrderForEmail(ctx, order, injector) {
    const entityHydrator = injector.get(core_1.EntityHydrator);
    const relations = [
        "lines",
        "lines.taxLines",
        "lines.productVariant",
        "lines.productVariant.product",
        "lines.featuredAsset",
        "shippingLines",
        "shippingLines.taxLines",
        "shippingLines.shippingMethod",
    ];
    await entityHydrator.hydrate(ctx, order, { relations });
}
