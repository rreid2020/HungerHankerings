import { redirect } from "next/navigation"
import Link from "next/link"
import Button from "../../components/Button"
import { getAuthUser, getAuthToken } from "../../lib/auth"
import { getCustomerOrders, confirmAccount } from "../../lib/saleor"

export default async function AccountPage({
  searchParams
}: {
  searchParams: Promise<{ email?: string; token?: string; [key: string]: string | undefined }>
}) {
  const params = await searchParams

  // Check for confirmation token first (before auth check)
  const confirmationEmail = params.email
  const confirmationToken = params.token || params.t || params.key

  if (confirmationEmail && confirmationToken) {
    try {
      const result = await confirmAccount(confirmationEmail, confirmationToken)

      if (result.errors?.length) {
        redirect(`/account/confirm?error=${encodeURIComponent(result.errors[0].message)}&email=${encodeURIComponent(confirmationEmail)}&token=${encodeURIComponent(confirmationToken)}`)
      }

      redirect("/login?confirmed=true&redirect=/account")
    } catch (error) {
      redirect(`/account/confirm?error=${encodeURIComponent(error instanceof Error ? error.message : "Confirmation failed")}&email=${encodeURIComponent(confirmationEmail)}&token=${encodeURIComponent(confirmationToken)}`)
    }
  }

  const { user, hasToken } = await getAuthUser()

  if (!hasToken) {
    redirect("/login?redirect=/account")
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-medium">Couldn't load your account.</p>
        <p className="mt-1 text-sm">Please refresh the page or try again later.</p>
      </div>
    )
  }

  const authToken = await getAuthToken()
  let ordersData: Awaited<ReturnType<typeof getCustomerOrders>> = { orders: [], hasNextPage: false }

  try {
    if (authToken) {
      ordersData = await getCustomerOrders(authToken, 5)
    }
  } catch (error) {
    console.error("Failed to fetch orders:", error)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome back, {user.firstName}!
        </p>
      </div>

      {/* Account Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Account Information</h2>
          <div className="mt-4 space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium text-foreground">{user.firstName} {user.lastName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium text-foreground">{user.email}</span>
            </p>
            {user.phone && (
              <p>
                <span className="text-muted-foreground">Phone:</span>{" "}
                <span className="font-medium text-foreground">{user.phone}</span>
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Email Confirmed:</span>{" "}
              <span className={user.isConfirmed ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                {user.isConfirmed ? "Yes" : "No"}
              </span>
            </p>
          </div>
          <div className="mt-4">
            <Button href="/account/profile" variant="secondary" className="text-sm">
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
            <Link
              href="/account/orders"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          {ordersData.orders.length > 0 ? (
            <div className="mt-4 space-y-3">
              {ordersData.orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.token}`}
                  className="block rounded-md border border-border p-3 transition hover:bg-muted"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Order #{order.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">
                        ${order.total.gross.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {order.status.toLowerCase().replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>No orders yet</p>
              <Button href="/themed-snack-boxes" variant="secondary" className="mt-4">
                Start Shopping
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/account/orders"
            className="inline-flex items-center justify-start rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            View Order History
          </Link>
          <Link
            href="/account/addresses"
            className="inline-flex items-center justify-start rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Manage Addresses
          </Link>
          <Link
            href="/account/profile"
            className="inline-flex items-center justify-start rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Update Profile
          </Link>
          <Link
            href="/themed-snack-boxes"
            className="inline-flex items-center justify-start rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Shop Snack Boxes
          </Link>
        </div>
      </div>
    </div>
  )
}
