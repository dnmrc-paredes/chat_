"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { browserClient } from "@/lib/supabase/client"
import type { DMMessage } from "@/components/DM/DMThread"

const PAGE_SIZE = 40
const INITIAL_PAGE_SIZE = 30

type UseDMDataProps = {
  conversationId: string
  currentUserId: string
  peerId: string
  initialMessages: DMMessage[]
  initialPeerLastReadAt: string | null
}

type UseDMDataReturn = {
  messages: DMMessage[]
  setMessages: React.Dispatch<React.SetStateAction<DMMessage[]>>
  peerLastReadAt: string | null
  isLoadingOlder: boolean
  loadOlder: () => Promise<void>
  markAsRead: () => Promise<void>
  markConversationDelivered: () => Promise<void>
  sendMessage: (
    text: string,
    attachment?: { path: string; name: string; type: string } | null,
  ) => Promise<DMMessage | null>
  editMessage: (messageId: string, text: string) => Promise<void>
  deleteMessage: (message: DMMessage) => Promise<void>
  setPeerLastReadAt: Dispatch<SetStateAction<string | null>>
}

export function useDMData({
  conversationId,
  currentUserId,
  peerId,
  initialMessages,
  initialPeerLastReadAt,
}: UseDMDataProps): UseDMDataReturn {
  const [messages, setMessages] = useState<DMMessage[]>(initialMessages)
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(
    initialPeerLastReadAt,
  )
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(
    initialMessages.length === INITIAL_PAGE_SIZE,
  )

  const oldestRef = useRef<DMMessage | null>(initialMessages[0] ?? null)

  const markAsRead = useCallback(async () => {
    const { error } = await browserClient().rpc("mark_conversation_read", {
      conv_id: conversationId,
    })
    if (error) console.error(error)
  }, [conversationId])

  const markConversationDelivered = useCallback(async () => {
    const { error } = await browserClient().rpc("mark_messages_delivered", {
      conv_id: conversationId,
    })
    if (error) console.error(error)
  }, [conversationId])

  useEffect(() => {
    markAsRead()
  }, [markAsRead])

  useEffect(() => {
    markConversationDelivered()
  }, [markConversationDelivered])

  useEffect(() => {
    const supabase = browserClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let disposed = false

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) await supabase.realtime.setAuth(session.access_token)
      if (disposed) return

      channel = supabase
        .channel(`dm:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "dm_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const message = payload.new as DMMessage
            setMessages((prev) =>
              prev.some((existing) => existing.id === message.id)
                ? prev
                : [...prev, message],
            )
            if (message.sender_id !== currentUserId) {
              markConversationDelivered()
              markAsRead()
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "dm_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const updated = payload.new as DMMessage
            setMessages((prev) =>
              prev.map((message) =>
                message.id === updated.id
                  ? { ...message, ...updated }
                  : message,
              ),
            )
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversations",
            filter: `id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as {
              user_a: string
              user_a_last_read_at: string | null
              user_b_last_read_at: string | null
            }
            const read =
              peerId === row.user_a
                ? row.user_a_last_read_at
                : row.user_b_last_read_at
            setPeerLastReadAt(read)
          },
        )
        .subscribe()
    }

    setup()

    return () => {
      disposed = true
      if (channel) browserClient().removeChannel(channel)
    }
  }, [
    conversationId,
    currentUserId,
    markConversationDelivered,
    markAsRead,
    peerId,
  ])

  const loadOlder = useCallback(async () => {
    const oldest = oldestRef.current
    if (!oldest || isLoadingOlder || !hasMore) return

    setIsLoadingOlder(true)

    try {
      const { data, error } = await browserClient()
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .lt("created_at", oldest.created_at)
        .limit(PAGE_SIZE)

      if (error) {
        console.error(error)
        return
      }

      if (data) {
        const older = (data as DMMessage[]).reverse()

        setMessages((prev) => {
          const seen = new Set(prev.map((message) => message.id))
          const fresh = older.filter((message) => !seen.has(message.id))
          oldestRef.current = fresh[0] ?? oldestRef.current
          return [...fresh, ...prev]
        })

        if ((data as DMMessage[]).length < PAGE_SIZE) setHasMore(false)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingOlder(false)
    }
  }, [conversationId, hasMore, isLoadingOlder])

  const sendMessage = useCallback(
    async (
      text: string,
      attachment?: { path: string; name: string; type: string } | null,
    ) => {
      const { data, error } = await browserClient()
        .from("dm_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          sender_name: "",
          text,
          attachment_path: attachment?.path ?? null,
          attachment_name: attachment?.name ?? null,
          attachment_type: attachment?.type ?? null,
        })
        .select()
        .single()

      if (error) {
        console.error(error)
        return null
      }

      const sent = data as DMMessage
      setMessages((prev) =>
        prev.some((existing) => existing.id === sent.id)
          ? prev
          : [...prev, sent],
      )
      return sent
    },
    [conversationId, currentUserId],
  )

  const editMessage = useCallback(async (messageId: string, text: string) => {
    const { error } = await browserClient()
      .from("dm_messages")
      .update({ text, edited_at: new Date().toISOString() })
      .eq("id", messageId)

    if (error) {
      console.error(error)
      return
    }

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, text, edited_at: new Date().toISOString() }
          : message,
      ),
    )
  }, [])

  const deleteMessage = useCallback(async (message: DMMessage) => {
    const { error } = await browserClient()
      .from("dm_messages")
      .update({
        deleted_at: new Date().toISOString(),
        text: "",
        attachment_path: null,
        attachment_name: null,
        attachment_type: null,
      })
      .eq("id", message.id)

    if (error) {
      console.error(error)
      return
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              deleted_at: new Date().toISOString(),
              text: "",
              attachment_path: null,
              attachment_name: null,
              attachment_type: null,
            }
          : m,
      ),
    )
  }, [])

  return {
    messages,
    setMessages,
    peerLastReadAt,
    isLoadingOlder,
    loadOlder,
    markAsRead,
    markConversationDelivered,
    sendMessage,
    editMessage,
    deleteMessage,
    setPeerLastReadAt,
  }
}
