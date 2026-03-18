import { NextRequest, NextResponse } from "next/server"
import { customerRegister, customerLogin, refreshCustomerVerification } from "../../../../lib/vendure"
import { cookieSecureFromRequest } from "../../../../lib/cookie-secure"

const regCookieOpts = (secure: boolean) =>
  ({
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  }) as const

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json()

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    // Register the customer
    const result = await customerRegister({
      email,
      password,
      firstName,
      lastName,
      redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/account/confirm`
    })

    if (result.errors?.length) {
      const errorMessage = result.errors[0].message
      const errorField = result.errors[0].field
      const em = errorMessage.toLowerCase()
      const maybeExistingAccount =
        em.includes("verify") ||
        em.includes("already") ||
        em.includes("exist") ||
        em.includes("registered") ||
        em.includes("in use")

      if (maybeExistingAccount) {
        const refresh = await refreshCustomerVerification(email.trim())
        if (refresh.ok) {
          return NextResponse.json({
            success: true,
            requiresConfirmation: true,
            message:
              "We sent another verification email to this address. Check your inbox and spam folder, then click the link to confirm before signing in.",
          })
        }
      }

      if (
        errorMessage.toLowerCase().includes("already exists") ||
        errorMessage.toLowerCase().includes("email")
      ) {
        return NextResponse.json(
          {
            error: errorMessage,
            field: errorField,
            emailExists: true,
            suggestion:
              "This email may already be registered. Try signing in, or use Forgot password if you need access.",
          },
          { status: 400 }
        )
      }

      return NextResponse.json({ error: errorMessage, field: errorField }, { status: 400 })
    }

    // Check if account was created but requires email confirmation
    if (result.user && !result.user.isConfirmed) {
      return NextResponse.json({
        success: true,
        requiresConfirmation: true,
        message: "Account created successfully. Please check your email to confirm your account before logging in.",
        user: result.user
      })
    }

    // Try to auto-login after registration (only if account is confirmed)
    try {
      const loginResult = await customerLogin(email, password)
      const secure = cookieSecureFromRequest(request)
      const res = NextResponse.json({ success: true, user: loginResult.user })
      res.cookies.set("vendure_token", loginResult.token, {
        ...regCookieOpts(secure),
        maxAge: 60 * 60 * 24 * 7,
      })
      res.cookies.set("vendure_refresh_token", loginResult.refreshToken, {
        ...regCookieOpts(secure),
        maxAge: 60 * 60 * 24 * 30,
      })
      return res
    } catch (loginError) {
      // After register, Vendure often returns "Please verify this email address before logging in" (not "confirm")
      const errorMessage = loginError instanceof Error ? loginError.message : "Login failed"
      const em = errorMessage.toLowerCase()
      if (
        em.includes("confirm") ||
        em.includes("confirmation") ||
        em.includes("verify")
      ) {
        return NextResponse.json({
          success: true,
          requiresConfirmation: true,
          message:
            "Account created. Check your email for the verification link, then sign in. (Check spam if you don’t see it.)",
        })
      }

      throw loginError
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 400 }
    )
  }
}
