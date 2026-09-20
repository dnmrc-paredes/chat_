"use client"

import type {
  RealtimeChannel,
  RealtimePresenceState,
} from "@supabase/supabase-js"
import { useCallback, useEffect, useState } from "react"
import { useSession } from "@/hooks/useAuth"
import { browserClient } from "@/lib/supabase/client"

const CHANNEL = "presence:online"

type PresencePayload = { user_id: string }
type Listener = (ids: Set<string>) => void

let channel: RealtimeChannel | null = null
let userId: string | null = null
let joined = false
let onlineIds = new Set<string>()
const listeners = new Set<Listener>()

const notify = () => {
  for (const listener of listeners) listener(onlineIds)
}

const setup = () => {
  if (channel) return

  channel = browserClient()
    .channel(CHANNEL)
    .on("presence", { event: "sync" }, () => {
      const state =
        channel?.presenceState() as RealtimePresenceState<PresencePayload>
      onlineIds = new Set(
        Object.values(state)
          .flat()
          .map((presence) => presence.user_id),
      )
      notify()
    })

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      joined = true
      if (userId) channel?.track({ user_id: userId } satisfies PresencePayload)
    } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
      joined = false
    }
  })
}

const trackUser = (id: string | null) => {
  userId = id

  if (id === null) {
    channel?.untrack()
    onlineIds = new Set()
    notify()
    return
  }

  setup()
  if (joined) {
    channel?.track({ user_id: id } satisfies PresencePayload)
  }
}

export const useOnlineUsers = () => {
  const { user } = useSession()
  const id = user?.id ?? null
  const [ids, setIds] = useState<Set<string>>(new Set())

  const handleUpdate = useCallback((next: Set<string>) => {
    setIds(new Set(next))
  }, [])

  useEffect(() => {
    trackUser(id)
    listeners.add(handleUpdate)

    const frame = requestAnimationFrame(() => handleUpdate(onlineIds))

    return () => {
      cancelAnimationFrame(frame)
      listeners.delete(handleUpdate)
    }
  }, [id, handleUpdate])

  return ids
}
