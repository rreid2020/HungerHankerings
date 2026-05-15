import { loadOpsOrdersCenter } from "../../../../lib/vendure-admin"

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currencyCode || "CAD",
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

type SearchParams = Record<string, string | string[] | undefined>

function singleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "")
}

export default async function OpsOrdersPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const snapshot = await loadOpsOrdersCenter()
  const stateFilter = singleParam(searchParams?.state).trim()
  const paymentFilter = singleParam(searchParams?.payment).trim()
  const daysFilter = Number(singleParam(searchParams?.days) || "0")
  const highValueOnly = singleParam(searchParams?.highValue) === "1"

  if (!snapshot.ok) {
    return (
      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h1 className="text-sm font-semibold text-amber-900">Orders Center unavailable</h1>
        <p className="mt-1 text-sm text-amber-800">{snapshot.message}</p>
        <p className="mt-2 text-xs text-amber-700">Endpoint: {snapshot.endpoint}</p>
      </section>
    )
  }

  const nowMs = Date.now()
  const filtered = snapshot.orders.filter((order) => {
    if (stateFilter && order.state !== stateFilter) return false
    if (paymentFilter && order.paymentState !== paymentFilter) return false
    if (highValueOnly && !order.flags.includes("high_value")) return false
    if (daysFilter > 0 && order.placedAt) {
      const ageDays = (nowMs - new Date(order.placedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (ageDays > daysFilter) return false
    }
    return true
  })

  const uniqueStates = Array.from(new Set(snapshot.orders.map((o) => o.state))).sort()
  const uniquePaymentStates = Array.from(new Set(snapshot.orders.map((o) => o.paymentState))).sort()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Order Operations Center</h1>
        <p className="mt-2 text-sm text-slate-600">
          Recent orders with operational flags for delayed, unpaid, and high-value orders.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Total Orders</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {snapshot.summary.totalOrders.toLocaleString("en-CA")}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Delayed</div>
          <div className="mt-1 text-2xl font-semibold text-amber-700">
            {snapshot.summary.delayedOrders.toLocaleString("en-CA")}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Unpaid</div>
          <div className="mt-1 text-2xl font-semibold text-rose-700">
            {snapshot.summary.unpaidOrders.toLocaleString("en-CA")}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">High Value</div>
          <div className="mt-1 text-2xl font-semibold text-indigo-700">
            {snapshot.summary.highValueOrders.toLocaleString("en-CA")}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <form className="grid gap-3 md:grid-cols-5">
          <select
            name="state"
            defaultValue={stateFilter}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            <option value="">All order states</option>
            {uniqueStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <select
            name="payment"
            defaultValue={paymentFilter}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            <option value="">All payment states</option>
            {uniquePaymentStates.map((payment) => (
              <option key={payment} value={payment}>
                {payment}
              </option>
            ))}
          </select>
          <select
            name="days"
            defaultValue={daysFilter ? String(daysFilter) : ""}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            <option value="">All dates</option>
            <option value="1">Last 24h</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" name="highValue" value="1" defaultChecked={highValueOnly} />
            High-value only
          </label>
          <button
            type="submit"
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Apply filters
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Placed</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Order State</th>
                <th className="px-4 py-2 font-medium">Payment</th>
                <th className="px-4 py-2 font-medium">Fulfillment</th>
                <th className="px-4 py-2 font-medium">Flags</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">{order.code}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {order.placedAt ? new Date(order.placedAt).toLocaleString("en-CA") : "Not placed"}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    <div>{order.customerName}</div>
                    <div className="text-xs text-slate-500">{order.customerEmail}</div>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{order.state}</td>
                  <td className="px-4 py-2 text-slate-700">{order.paymentState}</td>
                  <td className="px-4 py-2 text-slate-700">{order.fulfillmentState}</td>
                  <td className="px-4 py-2 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {order.flags.length === 0 ? (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">none</span>
                      ) : (
                        order.flags.map((flag) => (
                          <span
                            key={`${order.id}:${flag}`}
                            className={
                              flag === "delayed"
                                ? "rounded bg-amber-100 px-2 py-0.5 text-amber-700"
                                : flag === "unpaid"
                                  ? "rounded bg-rose-100 px-2 py-0.5 text-rose-700"
                                  : "rounded bg-indigo-100 px-2 py-0.5 text-indigo-700"
                            }
                          >
                            {flag.replace("_", " ")}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-900">
                    {formatMoney(order.totalWithTax, order.currencyCode)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No orders match the current filters.
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
