/**
 * Checkout form fields (billing, shipping, gift, etc.) are persisted in localStorage
 * so users don't lose progress. Clear this when starting a fresh checkout.
 */
export const CHECKOUT_DRAFT_STORAGE_KEY = "hungerhankerings_checkout_draft_v1"

export function clearCheckoutDraftFromBrowser(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
