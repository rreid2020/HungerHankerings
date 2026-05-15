import { loadOpsCustomer360 } from "../../../../lib/vendure-admin"

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currencyCode || "CAD",
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

export default async function OpsCustomersPage() {
  const snapshot = await loadOpsCustomer360()

  if (!snapshot.ok) {
    return (
      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h1 className="text-sm font-semibold text-amber-900">Customer 360 unavailable</h1>
        <p className="mt-1 text-sm text-amber-800">{snapshot.message}</p>
        <p className="mt-2 text-xs text-amber-700">Endpoint: {snapshot.endpoint}</p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Customer 360</h1>
        <p className="mt-2 text-sm text-slate-600">
          Read-only customer overview with order count, sample LTV, and last order date.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Total Customers</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {snapshot.summary.totalCustomers.toLocaleString("en-CA")}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Active In Sample</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">
            {snapshot.summary.activeCustomersInSample.toLocaleString("en-CA")}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Repeat In Sample</div>
          <div className="mt-1 text-2xl font-semibold text-indigo-700">
            {snapshot.summary.repeatCustomersInSample.toLocaleString("en-CA")}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Top Customers by Revenue (sample)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 text-right font-medium">Orders</th>
                <th className="px-4 py-2 text-right font-medium">LTV (sample)</th>
                <th className="px-4 py-2 font-medium">Last order</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.customers.slice(0, 100).map((customer) => (
                <tr key={customer.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-700">
                    <div className="font-medium text-slate-900">{customer.name}</div>
                    <div className="text-xs text-slate-500">{customer.email}</div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("en-CA") : "N/A"}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-900">
                    {customer.ordersCount.toLocaleString("en-CA")}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-900">
                    {formatMoney(customer.lifetimeValue, customer.currencyCode)}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {customer.lastOrderAt
                      ? new Date(customer.lastOrderAt).toLocaleDateString("en-CA")
                      : "No orders"}
                  </td>
                </tr>
              ))}
              {snapshot.customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No customers returned by Vendure.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
