import { redirect, notFound } from "next/navigation"
import Image from "next/image"
import { getAuthUser, getAuthToken } from "../../../../lib/auth"
import { getOrderByToken, storefrontDisplayCurrency } from "../../../../lib/vendure"

function orderMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: storefrontDisplayCurrency(currencyCode),
  }).format(amount)
}

export default async function OrderDetailPage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { user, hasToken } = await getAuthUser()

  if (!hasToken) {
    redirect("/login?redirect=/account/orders")
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-medium">Couldn’t load your account.</p>
        <p className="mt-1 text-sm">Please refresh the page or try again later.</p>
      </div>
    )
  }

  const order = await getOrderByToken(token)

  if (!order) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Order Details</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Order #{order.number}
        </p>
      </div>

      {/* Order Summary */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Order Information</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Order Number:</span>{" "}
                <span className="font-medium">{order.number}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Date:</span>{" "}
                <span className="font-medium">
                  {new Date(order.created).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className="font-medium capitalize">
                  {order.status.toLowerCase().replace("_", " ")}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-medium text-lg">
                  {orderMoney(
                    order.amountPaid?.amount ?? order.total.gross.amount,
                    order.currencyCode,
                  )}
                </span>
              </p>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Shipping Address</h2>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </p>
                <p>{order.shippingAddress.streetAddress1}</p>
                {order.shippingAddress.streetAddress2 && <p>{order.shippingAddress.streetAddress2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country.country}</p>
                {order.shippingAddress.phone && <p className="mt-2">Phone: {order.shippingAddress.phone}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Order Items</h2>
        <div className="space-y-4">
          {order.lines.map((line) => (
            <div key={line.id} className="flex gap-4 border-b border-border pb-4 last:border-0">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center">
                {line.thumbnail?.url ? (
                  <Image
                    src={line.thumbnail.url}
                    alt={line.productName}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized={line.thumbnail.url.startsWith("http")}
                  />
                ) : (
                  <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{line.productName}</h3>
                {line.variantName && (
                  <p className="text-sm text-muted-foreground">{line.variantName}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  Quantity: {line.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">
                  {orderMoney(line.unitPrice.net.amount, order.currencyCode)}
                  <span className="block text-xs font-normal text-muted-foreground">each (ex. tax)</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {orderMoney(line.lineTotalNet.amount, order.currencyCode)} line (ex. tax)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
