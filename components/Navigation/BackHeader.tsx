"use client"

import { ArrowLeft } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useHasNavigated } from "@/components/Providers/Navigation"

export const BackHeader = () => {
  const pathname = usePathname()
  const router = useRouter()
  const hasNavigated = useHasNavigated()

  const hidden =
    pathname === "/" ||
    pathname === "/home" ||
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname.startsWith("/dms")

  if (!hasNavigated || hidden) return null

  return (
    <header className="flex items-center gap-3 border-b-2 border-input p-3">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Back"
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
      >
        <ArrowLeft size={20} />
      </button>
    </header>
  )
}
