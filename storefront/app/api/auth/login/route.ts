import { NextRequest, NextResponse } from "next/server"
import { customerLogin } from "../../../../lib/vendure"
import { cookies } from "next/headers"
import { cookieSecureFromRequest } from "../../../../lib/cookie-secure"

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
        const origin = request.nextUrl.origin
        const url = new URL("/login", origin)
        url.searchParams.set("error", encodeURIComponent(message))
        if (redirectTo) url.searchParams.set("redirect", redirectTo)
        return NextResponse.redirect(url)
      }
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const result = await customerLogin(email.trim(), password)
    const secure = cookieSecureFromRequest(request)

    const cookieStore = await cookies()
    cookieStore.set("vendure_token", result.token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })
    cookieStore.set("vendure_refresh_token", result.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })

    if (isForm) {
      const target = redirectTo?.trim() && redirectTo.startsWith("/") ? redirectTo : "/account"
      const origin = request.nextUrl.origin
      return NextResponse.redirect(new URL(target, origin))
    }

    return NextResponse.json({ success: true, user: result.user })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed"
    const contentType = request.headers.get("content-type") ?? ""
    const isForm =
      contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")

    if (isForm) {
      const origin = request.nextUrl.origin
      const url = new URL("/login", origin)
      url.searchParams.set("error", encodeURIComponent(message))
      return NextResponse.redirect(url)
    }
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
