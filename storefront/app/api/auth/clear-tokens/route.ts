import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete("vendure_token")
  cookieStore.delete("vendure_refresh_token")
  
  return NextResponse.json({ success: true })
}
