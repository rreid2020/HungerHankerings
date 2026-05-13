import { SignUp } from "@clerk/nextjs"

export default function OpsSignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-12">
      <SignUp
        routing="path"
        path="/ops/sign-up"
        signInUrl="/ops/sign-in"
        forceRedirectUrl="/ops"
        appearance={{
          variables: { colorPrimary: "#f97316" },
        }}
      />
    </div>
  )
}
