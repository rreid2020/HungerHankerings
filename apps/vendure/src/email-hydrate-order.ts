import type { EntityRelationPaths, Injector, Order, RequestContext } from "@vendure/core";
import { EntityHydrator } from "@vendure/core";

/**
 * Ensures relations needed for {@link Order.taxSummary}, line display names, assets, and shipping labels.
 * Nested `*.taxLines` paths are valid at runtime; generated relation paths omit some TaxLine joins.
 */
export async function hydrateOrderForEmail(ctx: RequestContext, order: Order, injector: Injector): Promise<void> {
  const entityHydrator = injector.get(EntityHydrator);
  const relations = [
    "lines",
    "lines.taxLines",
    "lines.productVariant",
    "lines.productVariant.product",
    "lines.featuredAsset",
    "shippingLines",
    "shippingLines.taxLines",
    "shippingLines.shippingMethod",
  ] as unknown as Array<EntityRelationPaths<Order>>;
  await entityHydrator.hydrate(ctx, order, { relations });
}
