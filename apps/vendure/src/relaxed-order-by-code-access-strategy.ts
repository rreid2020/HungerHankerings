import type { OrderByCodeAccessStrategy, Order, RequestContext } from "@vendure/core";

/** Parse compact durations like 2h, 45m (same idea as `ms` package). */
function durationToMs(spec: string): number {
  const s = spec.trim();
  const m = /^(\d+)\s*([smhd])$/i.exec(s);
  if (!m) return 2 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  const mult = u === "s" ? 1000 : u === "m" ? 60_000 : u === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

/**
 * Like DefaultOrderByCodeAccessStrategy, but if `orderPlacedAt` is not set yet (common between
 * Stripe client confirm and server transitions), allow guests to load the order by code using
 * `createdAt` within the same anonymous window and only for pre-fulfillment payment-related states.
 */
export class RelaxedOrderByCodeAccessStrategy implements OrderByCodeAccessStrategy {
  private readonly windowMs: number;

  constructor(anonymousAccessDuration: string = "2h") {
    this.windowMs = durationToMs(anonymousAccessDuration);
  }

  canAccessOrder(ctx: RequestContext, order: Order): boolean {
    const activeUserMatches =
      order?.customer?.user?.id != null && order.customer!.user!.id === ctx.activeUserId;
    if (ctx.activeUserId && activeUserMatches) {
      return true;
    }

    const limit = this.windowMs;
    const now = Date.now();

    const anonymousAfterPlaced = () => {
      const orderPlaced = order.orderPlacedAt ? +order.orderPlacedAt : 0;
      return orderPlaced > 0 && now - orderPlaced < limit;
    };

    const anonymousAfterCreatePaymentStates = () => {
      if (order.orderPlacedAt) {
        return false;
      }
      const created = +new Date(order.createdAt as unknown as string);
      if (!Number.isFinite(created) || now - created >= limit) {
        return false;
      }
      return new Set([
        "AddingItems",
        "ArrangingPayment",
        "PaymentAuthorized",
        "PaymentSettled",
      ]).has(order.state);
    };

    if (!ctx.activeUserId && (anonymousAfterPlaced() || anonymousAfterCreatePaymentStates())) {
      return true;
    }
    return false;
  }
}
