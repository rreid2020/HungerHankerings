# Login “Nothing Happens” – Diagnosis

## Intended flow (step-by-step)

1. **User** is on `GET /login` (e.g. `http://localhost:3000/login`).
2. **User** fills email/password and clicks “Sign In”.
3. **Browser** does a **full-page POST** to `POST /api/auth/login` (same origin), body: `application/x-www-form-urlencoded` with `email`, `password`, `redirect`.
4. **Next.js** runs `storefront/app/api/auth/login/route.ts` `POST` handler.
5. **Handler** reads body, calls Saleor `tokenCreate` (via `customerLogin()` in `lib/saleor.ts`), sets `saleor_token` and `saleor_refresh_token` cookies, then returns **302 redirect** to `/account` (success) or `/login?error=...` (failure).
6. **Browser** follows the redirect and loads the new URL (account page or login with error).

If “nothing happens” (no redirect, no error, no console logs), the failure is at one of these points.

---

## Possible failure points

### A. Form never submits (browser never sends POST)

**What would show it**

- In DevTools → **Network** tab, after clicking “Sign In”, there is **no** request to `login` or `api/auth/login`.

**Possible causes**

- Something calls `preventDefault()` on the form’s submit event (e.g. global handler, wrapper component). We don’t have an `onSubmit` on the login form; worth confirming no parent/global handler does.
- HTML5 validation blocks submit (e.g. empty `email` or invalid format). Browser would show validation UI.
- The **running** app still has an old form (e.g. `action={loginAction}` Server Action) because the Docker image wasn’t rebuilt or the wrong image is used. Then submit might be a fetch that fails silently.

**Check**

- Network tab: do you see **any** request when you click “Sign In”? If **no** → problem is A (submit not happening).
- In **Elements**, inspect the form: does it have `action="/api/auth/login"` and `method="post"`? If not → wrong build/cache.

---

### B. POST is sent but not to the right place (404 / wrong host)

**What would show it**

- In Network tab there **is** a request to something like `login` or `api/auth/login`, but:
  - Status **404**, or
  - Request URL is not your storefront origin (e.g. not `http://localhost:3000/...` if you open the site at `http://localhost:3000`).

**Possible causes**

- `action` is wrong (e.g. typo, or different base path in Docker/proxy).
- Form is on a different origin than the API (e.g. site opened via different port or host).

**Check**

- In Network tab, click the request and note **Request URL** and **Status**. If 404 or URL is wrong → problem is B.

---

### C. POST reaches Next.js but handler doesn’t run or crashes before redirect

**What would show it**

- In Network tab you see a request to `.../api/auth/login` with method **POST** and status **500** (or no response / connection error).
- In **Docker logs** for the storefront container you see an error or stack trace when you try to sign in.

**Possible causes**

- Unhandled exception in the route (e.g. `customerLogin` throws, or `cookies()`/`redirect` misbehaves).
- Saleor API unreachable from the container (e.g. wrong `SALEOR_API_URL` or network), leading to timeout/error.

**Check**

- Network: status of `POST .../api/auth/login` (200 vs 302 vs 500).
- Docker: `docker compose logs storefront --tail 50` (or equivalent) right after a sign-in attempt. Temporary `console.log` in the route (see below) will confirm whether the handler runs.

---

### D. Handler runs and returns 302 but browser doesn’t follow redirect

**What would show it**

- In Network tab the `POST .../api/auth/login` request has status **302** and a `Location` header (e.g. `/account` or full URL).
- Page doesn’t change (still on login).

**Possible causes**

- Redirect response not valid (e.g. wrong `Location` format).
- Browser or extension blocking redirect (rare for same-origin).
- CORS / security policy (unlikely for same-origin POST + redirect).

**Check**

- In Network tab, open the `api/auth/login` request → **Headers** → **Response Headers**: is there `Location` and does the next request appear (to `/account` or `/login?error=...`)? If 302 but no follow-up request → problem is D.

---

## Quick checks (do these first)

1. **Confirm what’s running**
   - Rebuild: `docker compose build --no-cache storefront` then `docker compose up -d storefront`.
   - Hard refresh or incognito so the browser doesn’t use old JS/CSS.

2. **Confirm form in the DOM**
   - DevTools → **Elements** → find the `<form>` that contains “Sign In”.
   - Check: `action="/api/auth/login"`, `method="POST"`. If different → wrong build or cached page.

3. **Confirm POST and response**
   - DevTools → **Network** → leave it open, click “Sign In”.
   - Look for a request whose name/URL contains `login`.
   - Note: **Request URL**, **Method**, **Status code**, and (if 302) **Response Headers → Location**.

4. **Confirm server sees the request**
   - After adding the temporary logging below, try sign-in once and run:
     - `docker compose logs storefront --tail 30`
   - If you see `[LOGIN] POST /api/auth/login received` (and optionally payload), the request reaches the app. If you never see it → request never reached the container (A or B).

---

## Temporary logging (to confirm C)

Add this at the **very start** of the `POST` function in `storefront/app/api/auth/login/route.ts`:

```ts
export async function POST(request: NextRequest) {
  console.log("[LOGIN] POST /api/auth/login received", new Date().toISOString())
  // ... rest of handler
}
```

After one sign-in attempt, run:

```bash
docker compose logs storefront --tail 30
```

- If you see `[LOGIN] POST /api/auth/login received` → request reaches Next.js; problem is likely in handler or redirect (C or D).
- If you don’t see it → request never reached the server; problem is A or B.

Remove the `console.log` once you’ve finished diagnosing.

---

## Summary table

| Observation | Likely failure point |
|------------|----------------------|
| No request in Network on “Sign In” | A – form not submitting |
| Request URL wrong or 404 | B – wrong action / host |
| Request 500 or logs show error | C – handler or Saleor error |
| Request 302 but page doesn’t change | D – redirect not followed |
| No `[LOGIN]` in container logs | A or B – request not reaching app |

Use this to decide where to focus the fix (form submit, URL, handler/Saleor, or redirect).
