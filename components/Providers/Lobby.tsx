"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { useLobby } from "@/hooks/useLobby"

type LobbyContextValue = ReturnType<typeof useLobby>

const LobbyContext = createContext<LobbyContextValue | null>(null)

export const LobbyProvider = ({
  children,
  user,
}: {
  children: ReactNode
  user: User | null
}) => {
  const lobby = useLobby(user)

  return <LobbyContext.Provider value={lobby}>{children}</LobbyContext.Provider>
}

export const useLobbyChannel = () => {
  const context = useContext(LobbyContext)

  if (!context) {
    throw new Error("useLobbyChannel must be used within a LobbyProvider")
  }

  return context
}
