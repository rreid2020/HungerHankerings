# Customer accounts (registration, verification, password reset)

The storefront is configured for full customer account flows, matching [Vendure’s Customer Accounts](https://docs.vendure.io/current/core/storefront/customer-accounts) guide.

## What’s configured

| Flow | Storefront | Vendure |
|------|------------|--------|
| **Registration** | `/register` → `POST /api/auth/register` | `registerCustomerAccount`, `requireVerification` from env |
| **Email verification** | `/account/confirm?token=...` → `confirmAccount(token)` | `verifyCustomerAccount(token)`, EmailPlugin `verifyEmailAddressUrl` → `/account/confirm` |
| **Password reset (request)** | `/reset-password` (no token) → `POST /api/auth/request-password-reset` | `requestPasswordReset(emailAddress)` |
| **Password reset (set new)** | `/reset-password?token=...` → `POST /api/auth/reset-password` | `resetPassword(token, password)`, EmailPlugin `passwordResetUrl` → `/reset-password` |

- **Login**: `/login` → `POST /api/auth/login` (Vendure `login` mutation).
- **Logout**: `/api/auth/logout` (clears cookies; optionally call Vendure `logout`).

Vendure config (`apps/vendure/src/vendure-config.ts`):

- `authOptions.requireVerification` is driven by `VENDURE_REQUIRE_EMAIL_VERIFICATION` (default `true`; set to `false` only for dev/testing).
- EmailPlugin `globalTemplateVars`: `verifyEmailAddressUrl` = `APP_URL + "/account/confirm"`, `passwordResetUrl` = `APP_URL + "/reset-password"`.

## Environment variables

- **APP_URL** (Vendure): Base URL of the storefront (e.g. `https://hungerhankerings.com`). Used in verification and password-reset links.
- **VENDURE_REQUIRE_EMAIL_VERIFICATION**: Set to `false` to skip email verification (dev only).
- **SMTP_*** (Vendure): In production, set SMTP (e.g. Resend) so verification and password-reset emails are sent. See `deploy/env.production.example` and [DEV-EMAIL-VERIFICATION.md](./DEV-EMAIL-VERIFICATION.md).

## Links in the UI

- Login: “Sign up” → `/register`, “Forgot your password?” → `/reset-password`.
- Register: “Already have an account? Sign in” → `/login`.
- Reset password: “Back to Login” → `/login`; with token, form submits to set new password then redirects to `/login?reset=success`.

## Resend verification

If a user didn’t receive the verification email, they can try again: on register, if the backend returns an “already registered”/“verify” style error, the API calls `refreshCustomerVerification(email)` and tells the user to check their inbox. They can also register again with the same email to trigger another verification email (same behavior).
