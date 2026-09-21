import { NextResponse } from "next/server"
import { serverClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? searchParams.get("next_url")

  if (code) {
    const supabase = await serverClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/home"
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in`)
}
