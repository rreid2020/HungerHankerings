import { loadOpsVendureSnapshot } from "../../../../lib/vendure-admin"

function formatMoney(amount: number, currencyCode: string): string {
  const major = amount / 100
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currencyCode || "CAD",
    maximumFractionDigits: 2,
  }).format(major)
}

export default async function OpsCommercePage() {
  const snapshot = await loadOpsVendureSnapshot()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Commerce Snapshot</h1>
        <p className="mt-2 text-sm text-slate-600">
          Read-only operational metrics from Vendure Admin API.
        </p>
      </div>

      {!snapshot.ok ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Vendure API not ready</h2>
          <p className="mt-1 text-sm text-amber-800">{snapshot.message}</p>
          <p className="mt-2 text-xs text-amber-700">Endpoint: {snapshot.endpoint}</p>
          {snapshot.required?.length ? (
            <p className="mt-1 text-xs text-amber-700">
              Required: {snapshot.required.join(", ")}
            </p>
          ) : null}
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Orders</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {snapshot.summary.ordersTotal.toLocaleString("en-CA")}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Products</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {snapshot.summary.productsTotal.toLocaleString("en-CA")}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Customers</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {snapshot.summary.customersTotal.toLocaleString("en-CA")}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Recent Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Code</th>
                    <th className="px-4 py-2 font-medium">Placed</th>
                    <th className="px-4 py-2 font-medium">Customer</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.recentOrders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-900">{order.code}</td>
                      <td className="px-4 py-2 text-slate-600">
                        {order.placedAt
                          ? new Date(order.placedAt).toLocaleString("en-CA")
                          : "Not placed"}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        <div>{order.customerName}</div>
                        <div className="text-xs text-slate-500">{order.customerEmail}</div>
                      </td>
                      <td className="px-4 py-2 text-slate-700">{order.state}</td>
                      <td className="px-4 py-2 text-right text-slate-900">
                        {formatMoney(order.totalWithTax, order.currencyCode)}
                      </td>
                    </tr>
                  ))}
                  {snapshot.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        No orders returned by Vendure.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
