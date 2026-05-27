import Link from "next/link"
const plans = [
  {
    id: "starter",
    name: "Starter",
    description: "For solo firms and small teams getting started.",
  },
  {
    id: "growth",
    name: "Growth",
    description: "For growing firms that need collaboration and workflow controls.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For larger organizations with multi-team onboarding and governance.",
  },
] as const

export default function RegisterPage() {
  return (
    <div className="container-page py-16 sm:py-20">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Create Account
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Choose a Plan</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Select the plan that fits your company, then continue to onboarding to set up your firm
            profile and administrator account.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-foreground">{plan.name}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{plan.description}</p>
              <Link
                href={`/register/onboarding?plan=${encodeURIComponent(plan.id)}`}
                className="mt-5 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Continue with {plan.name}
              </Link>
            </article>
          ))}
        </section>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
