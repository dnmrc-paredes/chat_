"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

const emptySubscribe = () => () => {}
const mountedSnapshot = () => true

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme()
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    mountedSnapshot,
    () => false,
  )

  if (!isMounted) return <div className="size-10" />

  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex size-10 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
