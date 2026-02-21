import { redirect } from "next/navigation"
import Link from "next/link"
import Button from "../../../components/Button"
import { confirmAccount } from "../../../lib/saleor"

export default async function ConfirmAccountPage({
  searchParams
}: {
  searchParams: Promise<{ email?: string; token?: string; [key: string]: string | undefined }>
}) {
  const params = await searchParams
  // Try different possible parameter names
  const email = params.email || params.e
  const token = params.token || params.t || params.key

  if (!email || !token) {
    return (
      <div className="container-page flex flex-col items-center justify-center py-24">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Invalid Confirmation Link</h1>
          <p className="text-sm text-muted-foreground">
            The confirmation link is missing required parameters. Please check your email for the correct link.
          </p>
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-left">
              <p className="font-medium mb-2">Debug info:</p>
              <pre className="overflow-auto">{JSON.stringify(params, null, 2)}</pre>
            </div>
          )}
          <Button href="/login">Go to Login</Button>
        </div>
      </div>
    )
  }

  try {
    const result = await confirmAccount(email, token)

    if (result.errors?.length) {
      return (
        <div className="container-page flex flex-col items-center justify-center py-24">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Confirmation Failed</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.errors[0].message || "Unable to confirm your account. The link may have expired."}
              </p>
            </div>
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
              <p className="font-medium mb-2">What to do:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Try logging in - your account might already be confirmed</li>
                <li>Request a new confirmation email</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button href="/login" className="flex-1">Try Login</Button>
              <Button href="/register" variant="secondary" className="flex-1">
                Register Again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    // Success - redirect to login
    return (
      <div className="container-page flex flex-col items-center justify-center py-24">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="rounded-full bg-green-100 p-4 w-16 h-16 mx-auto flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Account Confirmed!</h1>
          <p className="text-sm text-muted-foreground">
            Your email has been confirmed. You can now log in to your account.
          </p>
          <Button href="/login">Go to Login</Button>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="container-page flex flex-col items-center justify-center py-24">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Confirmation Error</h1>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "An error occurred while confirming your account."}
          </p>
          <Button href="/login">Go to Login</Button>
        </div>
      </div>
    )
  }
}
