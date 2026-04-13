import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { LoginForm } from "./LoginForm"

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false }
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const error = typeof params.error === "string" ? params.error : undefined
  const redirectTo = (typeof params.redirect === "string" ? params.redirect : undefined) || "/account"
  const confirmed = params.confirmed === "true"
  const resetSuccess = params.reset === "success"
  const token = params.token ?? params.t
  const emailParam = params.email ?? params.e

  if (token && emailParam) {
    redirect(
      `/account/confirm?email=${encodeURIComponent(String(emailParam))}&token=${encodeURIComponent(String(token))}`
    )
  }

  return (
    <div className="container-page flex flex-col items-center justify-center py-24">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Customer Login</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account to view orders and manage your profile
          </p>
        </div>

        <LoginForm
          redirectTo={redirectTo}
          initialError={error}
          confirmed={confirmed}
          resetSuccess={resetSuccess}
        />
      </div>
    </div>
  )
}
