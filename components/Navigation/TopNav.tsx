"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const hidden = (pathname: string) =>
  pathname === "/" || pathname === "/sign-in" || pathname === "/sign-up"

export const TopNav = () => {
  const pathname = usePathname()

  if (hidden(pathname)) return null

  return (
    <header className="flex items-center justify-center border-b-2 border-input p-3">
      <Link
        href="/home"
        aria-label="chat_ home"
        className="font-heading text-lg font-medium tracking-tight"
      >
        chat_
      </Link>
    </header>
  )
}
