import Link from "next/link"
import { redirect } from "next/navigation"
import { LoginFormScript } from "./LoginFormScript"

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

        <form
          id="login-form"
          action="/api/auth/login"
          method="POST"
          encType="application/x-www-form-urlencoded"
          className="space-y-4"
        >
          <input type="hidden" name="redirect" value={redirectTo} />
          {confirmed && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              Account confirmed successfully! You can now log in.
            </div>
          )}
          {resetSuccess && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              Password reset successfully. You can now sign in with your new password.
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 whitespace-pre-line">
              {decodeURIComponent(error)}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            id="login-submit"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Sign In
          </button>
        </form>
        <LoginFormScript />

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
          <p className="mt-2">
            <Link href="/reset-password" className="text-primary hover:underline">
              Forgot your password?
            </Link>
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="mt-2 text-xs">
              <span className="text-muted-foreground">Dev:</span>{" "}
              <a
                href="http://localhost:8025"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Check Mailpit for confirmation emails
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
