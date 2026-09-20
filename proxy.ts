import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  if (!user) {
    if (url.pathname.startsWith("/home")) {
      url.pathname = "/sign-in"
      return NextResponse.redirect(url)
    }
  } else if (
    url.pathname === "/sign-in" ||
    url.pathname === "/sign-up" ||
    url.pathname === "/"
  ) {
    url.pathname = "/home"
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
