import { loadOpsProductPerformance } from "../../../../lib/vendure-admin"

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currencyCode || "CAD",
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

export default async function OpsProductsPage() {
  const snapshot = await loadOpsProductPerformance()

  if (!snapshot.ok) {
    return (
      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h1 className="text-sm font-semibold text-amber-900">Product performance unavailable</h1>
        <p className="mt-1 text-sm text-amber-800">{snapshot.message}</p>
        <p className="mt-2 text-xs text-amber-700">Endpoint: {snapshot.endpoint}</p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Product Performance</h1>
        <p className="mt-2 text-sm text-slate-600">
          Read-only performance view from Vendure orders and products.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Total Products</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {snapshot.summary.totalProducts.toLocaleString("en-CA")}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Sold (sample)</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">
            {snapshot.summary.soldProductsInSample.toLocaleString("en-CA")}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Low Stock Variants</div>
          <div className="mt-1 text-2xl font-semibold text-amber-700">
            {snapshot.summary.lowStockVariants.toLocaleString("en-CA")}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Zero Sales (sample)</div>
          <div className="mt-1 text-2xl font-semibold text-indigo-700">
            {snapshot.summary.zeroSalesProductsInSample.toLocaleString("en-CA")}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Top Products by Revenue (sample)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 text-right font-medium">Units</th>
                  <th className="px-4 py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.topProductsByRevenue.map((row) => (
                  <tr key={row.key} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-700">
                      <div className="font-medium text-slate-900">{row.productName}</div>
                      <div className="text-xs text-slate-500">SKU: {row.sku}</div>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-900">{row.units.toLocaleString("en-CA")}</td>
                    <td className="px-4 py-2 text-right text-slate-900">
                      {formatMoney(row.revenueWithTax, row.currencyCode)}
                    </td>
                  </tr>
                ))}
                {snapshot.topProductsByRevenue.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      No product sales found in sampled orders.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Low Stock Risk</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Variant</th>
                    <th className="px-4 py-2 font-medium">SKU</th>
                    <th className="px-4 py-2 text-right font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.lowStock.map((row, idx) => (
                    <tr key={`${row.sku}:${idx}`} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-700">
                        <div className="font-medium text-slate-900">{row.productName}</div>
                        <div className="text-xs text-slate-500">{row.variantName}</div>
                      </td>
                      <td className="px-4 py-2 text-slate-700">{row.sku}</td>
                      <td className="px-4 py-2 text-right text-rose-700">{row.stockOnHand}</td>
                    </tr>
                  ))}
                  {snapshot.lowStock.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        No low-stock variants in the sampled products.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">Zero Sales Products (sample)</h2>
            <p className="mt-1 text-xs text-slate-500">
              Products returned by Vendure products query that were not seen in sampled order lines.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {snapshot.zeroSalesProducts.slice(0, 12).map((product) => (
                <li key={product.id} className="truncate rounded bg-slate-50 px-2 py-1">
                  {product.name}
                </li>
              ))}
              {snapshot.zeroSalesProducts.length === 0 ? (
                <li className="rounded bg-slate-50 px-2 py-1 text-slate-500">No zero-sales products in sample.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
