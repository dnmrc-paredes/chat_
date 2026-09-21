"use client"

import { useEffect, useSyncExternalStore, type ReactNode } from "react"
import { usePathname } from "next/navigation"

let depth = 0
let lastPath: string | null = null
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getDepth = () => depth

const trackPath = (path: string) => {
  if (lastPath !== null && lastPath !== path) {
    depth += 1
    listeners.forEach((listener) => listener())
  }
  lastPath = path
}

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()

  useEffect(() => {
    trackPath(pathname)
  }, [pathname])

  return children
}

export const useHasNavigated = () =>
  useSyncExternalStore(subscribe, getDepth, () => 0) > 0
