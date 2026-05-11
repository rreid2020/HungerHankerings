import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function requireOpsUserId(): Promise<string> {
  try {
    const session = await auth()
    if (session.userId) return session.userId
  } catch {
    /* Clerk middleware returns 404 for unauthenticated API requests; keep this helper explicit. */
  }
  throw new Error("Unauthorized")
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

