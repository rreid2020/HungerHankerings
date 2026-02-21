export default function CheckoutLoading() {
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-8">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-dust_grey-200" />
          <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded bg-powder_petal-100" />
        </div>
        <div className="space-y-4">
          <div className="h-6 w-40 animate-pulse rounded bg-dust_grey-200" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-powder_petal-100" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-6 w-44 animate-pulse rounded bg-dust_grey-200" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-powder_petal-100" />
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-dust_grey-200 bg-white p-6">
        <div className="h-6 w-32 animate-pulse rounded bg-dust_grey-200" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-powder_petal-100" />
              <div className="h-4 w-16 animate-pulse rounded bg-powder_petal-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
