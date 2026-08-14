import { SignUp } from "@clerk/nextjs"

export default function OpsSignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
            <path d="M4 5h3v14H4V5Zm13 0h3v14h-3V5ZM9 5h6v4h-2v10h-2V9H9V5Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Hunger Hankerings Ops</h1>
          <p className="text-sm text-slate-600">Create your admin account</p>
        </div>
      </div>
      <SignUp
        routing="path"
        path="/ops/sign-up"
        signInUrl="/ops/sign-in"
        forceRedirectUrl="/ops"
        appearance={{
          variables: {
            colorPrimary: "#f97316",
            colorBackground: "#ffffff",
            borderRadius: "0.5rem",
          },
          elements: {
            card: "shadow-sm border border-slate-200",
            footerActionLink: "text-brand-600 hover:text-brand-700",
          },
        }}
      />
      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <a href="/ops/sign-in" className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700">
          Sign in
        </a>
      </p>
    </div>
  )
}
