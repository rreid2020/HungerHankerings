import { getOrderByToken } from "../../../lib/saleor"
import OrderClient, { OrderGiftDetails, OrderShippingDetails } from "./order-client"
import Link from "next/link"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function formatAddress(addr: {
  firstName?: string
  lastName?: string
  streetAddress1?: string
  streetAddress2?: string | null
  city?: string
  postalCode?: string
  country?: { code?: string; country?: string }
  countryArea?: string | null
}): string {
  const parts = [
    [addr.firstName, addr.lastName].filter(Boolean).join(" "),
    addr.streetAddress1,
    addr.streetAddress2,
    addr.city,
    addr.countryArea,
    addr.postalCode,
    addr.country?.country ?? addr.country?.code
  ].filter(Boolean)
  return parts.join(", ") || "—"
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const isSaleorToken = UUID_REGEX.test(id)
  const order = isSaleorToken ? await getOrderByToken(id) : null

  if (order) {
    return (
      <div className="container-page py-12">
        <h1 className="text-3xl font-semibold text-foreground">Order confirmed</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Thanks for your order. We’ll send confirmation to your email.
        </p>
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Order number</p>
            <p className="text-lg font-semibold text-foreground">#{order.number}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Order details</h2>
            <ul className="mt-4 space-y-2 border-t border-border pt-4">
              {order.lines?.map((line) => (
                <li key={line.id} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {line.productName}
                    {line.variantName ? ` — ${line.variantName}` : ""} × {line.quantity}
                  </span>
                  <span className="text-foreground">
                    ${(line.unitPrice?.gross?.amount ?? 0).toFixed(2)}{" "}
                    {line.unitPrice?.gross?.currency ?? "USD"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between border-t border-border pt-4 font-semibold text-foreground">
              <span>Total</span>
              <span>
                ${(order.total?.gross?.amount ?? 0).toFixed(2)}{" "}
                {order.total?.gross?.currency ?? "USD"}
              </span>
            </p>
          </div>
          {order.shippingAddress && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Shipping address</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatAddress(order.shippingAddress)}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            <Link href="/shop" className="text-primary hover:underline">
              Continue shopping
            </Link>
            {" · "}
            <Link href="/account/orders" className="text-primary hover:underline">
              View all orders
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-semibold text-iron_grey">Order Confirmed</h1>
      <p className="mt-4 text-sm text-iron_grey">
        Thanks for your order. We will send confirmation to your email.
      </p>
      <div className="mt-6 rounded-lg border border-dust_grey-200 bg-white p-6">
        <p className="text-sm text-iron_grey">Order ID</p>
        <p className="text-lg font-semibold text-iron_grey">
          <OrderClient fallbackId={id} />
        </p>
      </div>
      <OrderGiftDetails />
      <OrderShippingDetails />
    </div>
  )
}
