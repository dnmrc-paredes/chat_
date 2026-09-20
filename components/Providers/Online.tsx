"use client"

import { useOnlineUsers } from "@/hooks/useOnline"

export const OnlinePresenceProvider = () => {
  useOnlineUsers()
  return null
}
