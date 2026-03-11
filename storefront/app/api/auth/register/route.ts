import { NextRequest, NextResponse } from "next/server"
import { customerRegister, customerLogin } from "../../../../lib/vendure"
import { cookies } from "next/headers"

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
      
      // Check if email already exists - offer to resend confirmation or try login
      if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("email")) {
        return NextResponse.json(
          { 
            error: errorMessage,
            field: errorField,
            emailExists: true,
            suggestion: "This email is already registered. If you didn't receive a confirmation email, try logging in or check Mailpit at http://localhost:8025 (dev environment)."
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: errorMessage, field: errorField },
        { status: 400 }
      )
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

      // Set HTTP-only cookies for tokens
      const cookieStore = await cookies()
      cookieStore.set("vendure_token", loginResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
      cookieStore.set("vendure_refresh_token", loginResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })

      return NextResponse.json({
        success: true,
        user: loginResult.user
      })
    } catch (loginError) {
      // Login failed - likely due to email confirmation requirement
      const errorMessage = loginError instanceof Error ? loginError.message : "Login failed"
      
      if (errorMessage.includes("confirm") || errorMessage.includes("confirmation")) {
        return NextResponse.json({
          success: true,
          requiresConfirmation: true,
          message: "Account created successfully. Please check your email to confirm your account before logging in.",
          user: result.user
        })
      }
      
      // Re-throw other login errors
      throw loginError
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 400 }
    )
  }
}
