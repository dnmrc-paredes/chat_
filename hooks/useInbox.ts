"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "@/hooks/useAuth"
import type { DMMessage } from "@/components/DM/DMThread"
import { browserClient } from "@/lib/supabase/client"

type ConversationRow = {
  id: string
  user_a: string
  user_b: string
}

type ProfileRow = {
  id: string
  name: string
  username: string | null
}

type MessageRow = DMMessage & { is_read: boolean }

export type InboxConversation = {
  conversationId: string
  peerId: string
  peerName: string
  peerUsername: string | null
  lastMessage: MessageRow | null
  unread: number
}

export const useInbox = () => {
  const { user } = useSession()
  const [conversations, setConversations] = useState<InboxConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!user) return

    const supabase = browserClient()

    supabase
      .from("conversations")
      .select("id, user_a, user_b")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .then(({ data: convs }) => {
        const rows = (convs as ConversationRow[] | null) ?? []

        if (rows.length === 0) {
          setConversations([])
          setIsLoading(false)
          return
        }

        const conversationIds = rows.map((conversation) => conversation.id)
        const peerIds = rows.map((conversation) =>
          conversation.user_a === user.id
            ? conversation.user_b
            : conversation.user_a,
        )

        Promise.all([
          supabase
            .from("profiles")
            .select("id, name, username")
            .in("id", peerIds),
          supabase
            .from("dm_messages")
            .select(
              "id, conversation_id, sender_id, sender_name, text, created_at, is_read",
            )
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: false }),
        ]).then(([{ data: profiles }, { data: messages }]) => {
          const profileMap = new Map<string, ProfileRow>(
            (profiles as ProfileRow[] | null)?.map((profile) => [
              profile.id,
              profile,
            ]) ?? [],
          )

          const latest = new Map<string, MessageRow>()
          const unreadByConversation = new Map<string, number>()

          ;(messages as MessageRow[] | null | undefined)?.forEach((message) => {
            if (message.sender_id !== user.id && !message.is_read) {
              unreadByConversation.set(
                message.conversation_id,
                (unreadByConversation.get(message.conversation_id) ?? 0) + 1,
              )
            }

            if (!latest.has(message.conversation_id)) {
              latest.set(message.conversation_id, message)
            }
          })

          const inbox = rows
            .map((conversation) => {
              const peerId =
                conversation.user_a === user.id
                  ? conversation.user_b
                  : conversation.user_a
              const profile = profileMap.get(peerId)

              return {
                conversationId: conversation.id,
                peerId,
                peerName: profile?.name ?? "Unknown",
                peerUsername: profile?.username ?? null,
                lastMessage: latest.get(conversation.id) ?? null,
                unread: unreadByConversation.get(conversation.id) ?? 0,
              }
            })
            .sort(
              (a, b) =>
                new Date(b.lastMessage?.created_at ?? 0).getTime() -
                new Date(a.lastMessage?.created_at ?? 0).getTime(),
            )

          setConversations(inbox)
          setIsLoading(false)
        })
      })
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!user) return

    const supabase = browserClient()
    const channel = supabase
      .channel(`inbox:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dm_messages" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "dm_messages" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        refresh,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, refresh])

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!user) return

      browserClient()
        .from("dm_messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("is_read", false)
    },
    [user],
  )

  const unread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + conversation.unread, 0),
    [conversations],
  )

  return { conversations, unread, isLoading, markConversationRead }
}