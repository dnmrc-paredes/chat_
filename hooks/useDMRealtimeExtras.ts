"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { browserClient } from "@/lib/supabase/client"
import { LOBBY_CHANNEL } from "@/lib/supabase/broadcast"
import { USER_BLOCKED_EVENT } from "@/hooks/useLobby"

const TYPING_EVENT = "typing"
const TYPING_STOP_EVENT = "typing_stop"
const TYPING_THROTTLE_MS = 2000
const TYPING_VISIBLE_MS = 4000

type UseDMRealtimeExtrasProps = {
  conversationId: string
  currentUserId: string
  peerId: string
}

type UseDMRealtimeExtrasReturn = {
  typingPeer: boolean
  sendTyping: () => Promise<void>
  sendTypingStop: () => Promise<void>
  isLocallyBlocked: boolean
  probeBlocked: () => Promise<boolean>
  setIsLocallyBlocked: Dispatch<SetStateAction<boolean>>
}

export function useDMRealtimeExtras({
  conversationId,
  currentUserId,
  peerId,
}: UseDMRealtimeExtrasProps): UseDMRealtimeExtrasReturn {
  const [typingPeer, setTypingPeer] = useState(false)
  const [isLocallyBlocked, setIsLocallyBlocked] = useState(false)

  const typingChannelRef = useRef<RealtimeChannel | null>(null)
  const lastTypingSentRef = useRef(0)
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const probeBlocked = useCallback(async () => {
    const [blockersResult, myBlock] = await Promise.all([
      browserClient().rpc("get_my_blockers"),
      browserClient()
        .from("blocks")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("blocked_user_id", peerId)
        .maybeSingle(),
    ])

    const blockers = (blockersResult.data as { user_id: string }[] | null) ?? []
    return blockers.some((entry) => entry.user_id === peerId) || !!myBlock.data
  }, [currentUserId, peerId])

  useEffect(() => {
    const channel = browserClient()
      .channel(LOBBY_CHANNEL)
      .on("broadcast", { event: USER_BLOCKED_EVENT }, ({ payload }) => {
        const { target_id, sender_id } = payload as {
          target_id: string
          sender_id: string
        }

        if (target_id === currentUserId && sender_id === peerId) {
          setIsLocallyBlocked(true)
        }
      })
      .subscribe()

    return () => {
      browserClient().removeChannel(channel)
    }
  }, [currentUserId, peerId])

  useEffect(() => {
    const onTyping = (payload: { user_id: string }) => {
      if (payload.user_id === currentUserId) return
      setTypingPeer(true)
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current)
      typingClearTimerRef.current = setTimeout(
        () => setTypingPeer(false),
        TYPING_VISIBLE_MS,
      )
    }

    const onTypingStop = (payload: { user_id: string }) => {
      if (payload.user_id === currentUserId) return
      setTypingPeer(false)
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current)
    }

    const channel = browserClient()
      .channel(`dm-typing:${conversationId}`)
      .on("broadcast", { event: TYPING_EVENT }, ({ payload }) =>
        onTyping(payload as { user_id: string }),
      )
      .on("broadcast", { event: TYPING_STOP_EVENT }, ({ payload }) =>
        onTypingStop(payload as { user_id: string }),
      )

    typingChannelRef.current = channel
    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") console.error("Typing channel error")
    })

    return () => {
      browserClient().removeChannel(channel)
      typingChannelRef.current = null
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current)
    }
  }, [conversationId, currentUserId])

  const sendTyping = useCallback(async () => {
    const channel = typingChannelRef.current
    if (!channel) return

    const now = Date.now()
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return
    lastTypingSentRef.current = now

    try {
      await channel.send({
        type: "broadcast",
        event: TYPING_EVENT,
        payload: { user_id: currentUserId },
      })
    } catch (error) {
      console.error(error)
    }
  }, [currentUserId])

  const sendTypingStop = useCallback(async () => {
    const channel = typingChannelRef.current
    if (!channel) return

    try {
      await channel.send({
        type: "broadcast",
        event: TYPING_STOP_EVENT,
        payload: { user_id: currentUserId },
      })
    } catch (error) {
      console.error(error)
    }
  }, [currentUserId])

  return {
    typingPeer,
    sendTyping,
    sendTypingStop,
    isLocallyBlocked,
    probeBlocked,
    setIsLocallyBlocked,
  }
}
