/** Shown while the order confirmation segment is preparing (SSR / streaming). */
export default function OrderConfirmationLoading() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg animate-pulse rounded-2xl border border-border bg-card p-8">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="mt-4 h-4 w-full rounded bg-muted" />
        <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
      </div>
    </div>
  )
}
