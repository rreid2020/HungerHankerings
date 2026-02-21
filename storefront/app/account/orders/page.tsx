import { redirect } from "next/navigation"
import Link from "next/link"
import { getAuthUser, getAuthToken } from "../../../lib/auth"
import { getCustomerOrders } from "../../../lib/saleor"

export default async function OrdersPage() {
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

  const token = await getAuthToken()
  const ordersData = token ? await getCustomerOrders(token, 20) : { orders: [], hasNextPage: false }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Order History</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          View and track your orders
        </p>
      </div>

      {ordersData.orders.length > 0 ? (
        <div className="space-y-4">
          {ordersData.orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.token}`}
              className="block rounded-lg border border-border bg-card p-6 transition hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      Order #{order.number}
                    </h3>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium capitalize text-foreground">
                      {order.status.toLowerCase().replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Placed on {new Date(order.created).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {order.lines.length} item{order.lines.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">
                    ${order.total.gross.amount.toFixed(2)} {order.total.gross.currency}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">View Details →</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-lg font-medium text-foreground">No orders yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start shopping to see your orders here
          </p>
          <Link
            href="/themed-snack-boxes"
            className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
          >
            Shop Snack Boxes
          </Link>
        </div>
      )}
    </div>
  )
}
