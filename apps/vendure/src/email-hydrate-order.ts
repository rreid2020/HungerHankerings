import type { EntityRelationPaths, Injector, Order, RequestContext } from "@vendure/core";
import { EntityHydrator, Logger } from "@vendure/core";

const loggerCtx = "EmailHydrateOrder";

/**
 * Ensures relations needed for {@link Order.taxSummary}, line display names, and assets.
 *
 * Do **not** hydrate `shippingLines.shippingMethod` / `shippingLines.taxLines` here — that path
 * can make TypeORM look for unrelated columns (e.g. `last_name` on `ShippingLine`). Shipping
 * labels are loaded separately via {@link loadShippingLinesForEmailPlain}.
 */
export async function hydrateOrderForEmail(ctx: RequestContext, order: Order, injector: Injector): Promise<void> {
  const entityHydrator = injector.get(EntityHydrator);
  const relations = [
    "lines",
    "lines.taxLines",
    "lines.productVariant",
    "lines.productVariant.translations",
    "lines.productVariant.product",
    "lines.productVariant.product.translations",
    "lines.featuredAsset",
    "shippingLines",
  ] as unknown as Array<EntityRelationPaths<Order>>;

  try {
    await entityHydrator.hydrate(ctx, order, { relations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    Logger.warn(
      `Full order hydrate failed for ${order.code}; retrying without shippingLines. ${msg}`,
      loggerCtx,
    );
    const withoutShipping = relations.filter((r) => !String(r).startsWith("shippingLines"));
    await entityHydrator.hydrate(ctx, order, { relations: withoutShipping });
  }
}
