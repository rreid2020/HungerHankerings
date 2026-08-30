import type { Order } from "@vendure/core";

/** Matches storefront checkout `unitKey(lineId, unitIndex)` gift metadata keys. */
function parseGiftUnitKey(unitKey: string): { lineId: string; unitIndex: number } | null {
  const lastDash = unitKey.lastIndexOf("-");
  if (lastDash < 0) return null;
  const lineId = unitKey.slice(0, lastDash);
  const unitStr = unitKey.slice(lastDash + 1);
  const unitIndex = Number.parseInt(unitStr, 10);
  if (!Number.isFinite(unitIndex) || String(unitIndex) !== unitStr) return null;
  return { lineId, unitIndex };
}

export function giftLineLabel(order: Order, unitKey: string): string {
  const parsed = parseGiftUnitKey(unitKey);
  if (!parsed) return unitKey;
  const line = order.lines?.find((l) => l.id === parsed.lineId);
  if (!line) return unitKey;
  const pv = line.productVariant;
  const productName = pv?.product?.name?.trim() || "Line item";
  const variantName = pv?.name?.trim() || "";
  const title = variantName ? `${productName} — ${variantName}` : productName;
  const qty = line.quantity ?? 1;
  if (qty > 1) {
    return `${title} — Box ${parsed.unitIndex + 1} of ${qty}`;
  }
  return title;
}

function extractGiftMessage(value: unknown): string {
  if (typeof value === "string") {
    const s = value.trim();
    // Never treat raw JSON blobs as the customer-facing message.
    if (!s || s.startsWith("{") || s.startsWith("[")) return "";
    return s;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const fromKeys = [o.giftMessage, o.message, o.gift_message];
    for (const candidate of fromKeys) {
      if (typeof candidate === "string") {
        const s = candidate.trim();
        if (s && !s.startsWith("{") && !s.startsWith("[")) return s;
      }
    }
  }
  return "";
}

function parseGiftJson(raw: string): { unitKey: string; message: string }[] {
  const out: { unitKey: string; message: string }[] = [];
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
    for (const [key, v] of Object.entries(obj as Record<string, unknown>)) {
      const msg = extractGiftMessage(v);
      if (msg) out.push({ unitKey: key, message: msg });
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** Split the Admin-facing `giftMessages` textarea into labelled blocks. */
function rowsFromGiftMessagesDisplay(display: string): { unitKey: string; message: string; lineLabel: string }[] {
  return display
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        return {
          unitKey: `display-${i}`,
          lineLabel: lines[0],
          message: lines.slice(1).join("\n"),
        };
      }
      return {
        unitKey: `display-${i}`,
        lineLabel: "Gift message",
        message: block,
      };
    })
    .filter((row) => row.message.length > 0);
}

/**
 * Gift card messages from checkout.
 * Prefer Order custom field (Stripe path); fall back to settled payment metadata (legacy/dummy).
 */
export function giftRowsFromOrder(order: Order): { unitKey: string; message: string }[] {
  const fromCustom =
    order.customFields && typeof order.customFields.giftByLineUnitJson === "string"
      ? order.customFields.giftByLineUnitJson.trim()
      : "";
  if (fromCustom) {
    const rows = parseGiftJson(fromCustom);
    if (rows.length) return rows;
  }

  const payments = order.payments ?? [];
  const out: { unitKey: string; message: string }[] = [];
  for (const p of payments) {
    const st = p.state;
    if (st !== "Settled" && st !== "Authorized") continue;
    const meta = p.metadata as Record<string, unknown> | null | undefined;
    const raw =
      meta && typeof meta.gift_by_line_unit_json === "string" ? meta.gift_by_line_unit_json : undefined;
    if (!raw?.trim()) continue;
    out.push(...parseGiftJson(raw));
  }
  return out;
}

/** Gift wrap surcharge in minor units; not included in {@link Order.totalWithTax} when only added on Stripe PI. */
export function giftFeeCents(order: Order): number {
  const raw = order.customFields?.checkoutGiftSurchargeCents;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

export type GiftLineForEmail = { unitKey: string; message: string; lineLabel: string };

/**
 * Customer-facing gift lines for confirmation emails.
 * Prefer human-readable `giftMessages` (same as Admin "Gift card messages");
 * otherwise parse structured JSON — never dump raw JSON into the email body.
 */
export function buildGiftLinesForEmail(order: Order): GiftLineForEmail[] {
  const display =
    order.customFields && typeof order.customFields.giftMessages === "string"
      ? order.customFields.giftMessages.trim()
      : "";
  if (display && !display.startsWith("{") && !display.startsWith("[")) {
    return rowsFromGiftMessagesDisplay(display);
  }

  const structured = giftRowsFromOrder(order);
  if (structured.length) {
    return structured.map((row) => ({
      ...row,
      lineLabel: giftLineLabel(order, row.unitKey),
    }));
  }

  return [];
}
