"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { customerLogin } from "../../lib/saleor"

function isRedirectError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { digest?: string }).digest?.startsWith?.("NEXT_REDIRECT") === true
}

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim() ?? ""
  const password = (formData.get("password") as string) ?? ""
  const redirectTo = (formData.get("redirect") as string)?.trim()

  if (!email || !password) {
    const params = new URLSearchParams({ error: "Email and password are required" })
    if (redirectTo?.startsWith("/")) params.set("redirect", redirectTo)
    redirect(`/login?${params.toString()}`)
  }

  try {
    const result = await customerLogin(email, password)
    const cookieStore = await cookies()
    cookieStore.set("saleor_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })
    cookieStore.set("saleor_refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })
    const target = redirectTo?.startsWith("/") ? redirectTo : "/account"
    redirect(target)
  } catch (err) {
    if (isRedirectError(err)) throw err
    const message = err instanceof Error ? err.message : "Login failed"
    const params = new URLSearchParams({ error: message })
    if (redirectTo?.startsWith("/")) params.set("redirect", redirectTo)
    redirect(`/login?${params.toString()}`)
  }
}
