import { SignIn } from "@clerk/nextjs"

export default function OpsSignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12">
      <SignIn
        routing="path"
        path="/ops/sign-in"
        forceRedirectUrl="/ops"
        appearance={{
          baseTheme: "dark",
          variables: { colorPrimary: "#f97316" },
        }}
      />
    </div>
  )
}
