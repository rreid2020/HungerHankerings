import { NextRequest, NextResponse } from "next/server"
import { customerLogin, getCurrentCustomer } from "../../../../lib/vendure"
import { cookieSecureFromRequest } from "../../../../lib/cookie-secure"
import { getPublicOrigin } from "../../../../lib/public-origin"

const cookieOpts = (secure: boolean) =>
  ({
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  }) as const

async function getLoginPayload(request: NextRequest): Promise<{
  email: string
  password: string
  redirect?: string
  isForm?: boolean
}> {
  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const body = await request.json()
    return {
      email: body.email ?? "",
      password: body.password ?? "",
      redirect: body.redirect as string | undefined,
    }
  }
  const form = await request.formData()
  return {
    email: (form.get("email") as string) ?? "",
    password: (form.get("password") as string) ?? "",
    redirect: (form.get("redirect") as string) || undefined,
    isForm: true,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, redirect: redirectTo, isForm } = await getLoginPayload(request)

    if (!email?.trim() || !password) {
      const message = "Email and password are required"
      if (isForm) {
        const origin = getPublicOrigin(request)
        const url = new URL("/login", origin)
        url.searchParams.set("error", encodeURIComponent(message))
        if (redirectTo) url.searchParams.set("redirect", redirectTo)
        return NextResponse.redirect(url)
      }
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const result = await customerLogin(email.trim(), password)
    const secure = cookieSecureFromRequest(request)
    const maxAgeAccess = 60 * 60 * 24 * 7
    const maxAgeRefresh = 60 * 60 * 24 * 30

    // Warm the session so /account's getAuthUser sees it (Vendure session can be invisible until first use).
    for (let i = 0; i < 3; i++) {
      const customer = await getCurrentCustomer(result.token)
      if (customer) break
      if (i < 2) await new Promise((r) => setTimeout(r, 250))
    }

    if (isForm) {
      const target = redirectTo?.trim() && redirectTo.startsWith("/") ? redirectTo : "/account"
      const origin = getPublicOrigin(request)
      const res = NextResponse.redirect(new URL(target, origin))
      res.cookies.set("vendure_token", result.token, { ...cookieOpts(secure), maxAge: maxAgeAccess })
      res.cookies.set("vendure_refresh_token", result.refreshToken, {
        ...cookieOpts(secure),
        maxAge: maxAgeRefresh,
      })
      return res
    }

    const res = NextResponse.json({ success: true, user: result.user })
    res.cookies.set("vendure_token", result.token, { ...cookieOpts(secure), maxAge: maxAgeAccess })
    res.cookies.set("vendure_refresh_token", result.refreshToken, {
      ...cookieOpts(secure),
      maxAge: maxAgeRefresh,
    })
    return res
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed"
    const contentType = request.headers.get("content-type") ?? ""
    const isForm =
      contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")

    if (isForm) {
      const origin = getPublicOrigin(request)
      const url = new URL("/login", origin)
      url.searchParams.set("error", encodeURIComponent(message))
      return NextResponse.redirect(url)
    }
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
