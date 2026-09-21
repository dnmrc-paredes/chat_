"use client"

import { useCallback, useEffect, useRef, useState, type UIEvent } from "react"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Loader2,
  SendHorizonal,
} from "lucide-react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { browserClient } from "@/lib/supabase/client"
import { useHasNavigated } from "@/components/Providers/Navigation"
import { cn, deriveHandle, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Bubble, BubbleContent } from "../ui/bubble"

const PAGE_SIZE = 40
const INITIAL_PAGE_SIZE = 30
const MAX_LENGTH = 500
const TYPING_EVENT = "typing"
const TYPING_STOP_EVENT = "typing_stop"
const TYPING_THROTTLE_MS = 2000
const TYPING_VISIBLE_MS = 4000

export type DMMessage = {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  text: string
  created_at: string
  delivered_at: string | null
}

export type DMPeer = {
  id: string
  name: string
  username: string | null
}

type DMThreadProps = {
  conversationId: string
  peer: DMPeer
  currentUserId: string
  currentUserName: string
  initialMessages: DMMessage[]
  initialPeerLastReadAt: string | null
}

const formatTime = (timestamp: string) =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp))

export const DMThread = ({
  conversationId,
  peer,
  currentUserId,
  currentUserName,
  initialMessages,
  initialPeerLastReadAt,
}: DMThreadProps) => {
  const router = useRouter()
  const hasNavigated = useHasNavigated()
  const [messages, setMessages] = useState<DMMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(
    initialMessages.length === INITIAL_PAGE_SIZE,
  )
  const [typingPeer, setTypingPeer] = useState(false)
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(
    initialPeerLastReadAt,
  )
  const containerRef = useRef<HTMLDivElement | null>(null)
  const oldestRef = useRef<DMMessage | null>(initialMessages[0] ?? null)
  const scrollDataRef = useRef({ scrollHeight: 0, scrollTop: 0 })
  const nearBottomRef = useRef(true)
  const typingChannelRef = useRef<RealtimeChannel | null>(null)
  const lastTypingSentRef = useRef(0)
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    const el = containerRef.current
    const lastMessage = messages[messages.length - 1]
    if (!el || !lastMessage) return

    const isOwn = lastMessage.sender_id === currentUserId
    if (isOwn || nearBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, currentUserId])

  const markAsRead = useCallback(() => {
    browserClient()
      .rpc("mark_conversation_read", { conv_id: conversationId })
      .then(({ error }) => {
        if (error) console.error(error)
      })
  }, [conversationId])

  const markConversationDelivered = useCallback(() => {
    browserClient()
      .rpc("mark_messages_delivered", { conv_id: conversationId })
      .then(({ error }) => {
        if (error) console.error(error)
      })
  }, [conversationId])

  useEffect(() => {
    markAsRead()
  }, [markAsRead])

  useEffect(() => {
    markConversationDelivered()
  }, [markConversationDelivered])

  useEffect(() => {
    const supabase = browserClient()
    let channel: RealtimeChannel | null = null
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
              peer.id === row.user_a
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
    peer.id,
  ])

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

  const sendTyping = useCallback(() => {
    const channel = typingChannelRef.current
    if (!channel) return

    const now = Date.now()
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return
    lastTypingSentRef.current = now

    try {
      channel.send({
        type: "broadcast",
        event: TYPING_EVENT,
        payload: { user_id: currentUserId },
      })
    } catch (error) {
      console.error(error)
    }
  }, [currentUserId])

  const sendTypingStop = useCallback(() => {
    const channel = typingChannelRef.current
    if (!channel) return

    try {
      channel.send({
        type: "broadcast",
        event: TYPING_STOP_EVENT,
        payload: { user_id: currentUserId },
      })
    } catch (error) {
      console.error(error)
    }
  }, [currentUserId])

  const loadOlder = useCallback(async () => {
    const oldest = oldestRef.current
    if (!oldest || isLoadingOlder || !hasMore) return

    const el = containerRef.current
    scrollDataRef.current = {
      scrollHeight: el?.scrollHeight ?? 0,
      scrollTop: el?.scrollTop ?? 0,
    }
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

        requestAnimationFrame(() => {
          const container = containerRef.current
          if (!container) return
          const delta =
            container.scrollHeight - scrollDataRef.current.scrollHeight
          container.scrollTop = scrollDataRef.current.scrollTop + delta
        })
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingOlder(false)
    }
  }, [conversationId, hasMore, isLoadingOlder])

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    nearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (el.scrollTop < 32) loadOlder()
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    if (text.length > MAX_LENGTH) {
      toast("Message is too long.")
      return
    }

    sendTypingStop()
    setInput("")

    let sent: DMMessage | null = null

    try {
      const { data, error } = await browserClient()
        .from("dm_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          sender_name: currentUserName,
          text,
        })
        .select()
        .single()

      if (error) {
        console.error(error)
        toast("Failed to send message.")
        return
      }

      sent = data as DMMessage
    } catch (error) {
      console.error(error)
      toast("Failed to send message.")
      return
    }

    setMessages((prev) =>
      prev.some((existing) => existing.id === sent.id) ? prev : [...prev, sent],
    )

    requestAnimationFrame(() => {
      const el = containerRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  const handle = deriveHandle(peer.username, peer.name, peer.id)
  const length = input.trim().length
  const isOverLimit = length > MAX_LENGTH

  return (
    <div className="flex h-dvh w-full flex-col">
      <header className="flex items-center gap-3 border-b-2 border-input p-3">
        {hasNavigated && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <Avatar className="size-9">
          <AvatarFallback>{getInitials(peer.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{peer.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            @{handle}
          </span>
        </div>
      </header>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-6"
      >
        {isLoadingOlder && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No messages yet — say hi!
          </div>
        )}

        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId
          const isLastMessage = message.id === messages[messages.length - 1]?.id
          const isReadByPeer =
            isOwn &&
            !!peerLastReadAt &&
            new Date(message.created_at).getTime() <=
              new Date(peerLastReadAt).getTime()
          const isDelivered = isOwn && !!message.delivered_at

          return (
            <div
              key={message.id}
              className={cn(
                "flex max-w-[80%] flex-col gap-1",
                isOwn ? "items-end self-end" : "items-start self-start",
              )}
            >
              <Bubble
                align={isOwn ? "end" : "start"}
                variant={isOwn ? "default" : "secondary"}
              >
                <BubbleContent>{message.text}</BubbleContent>
              </Bubble>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>{formatTime(message.created_at)}</span>
                {isOwn &&
                  isLastMessage &&
                  (isReadByPeer ? (
                    <>
                      <CheckCheck size={12} className="text-primary" />
                      <span className="text-primary">Seen</span>
                    </>
                  ) : isDelivered ? (
                    <>
                      <CheckCheck size={12} />
                      <span>Delivered</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} />
                      <span>Sent</span>
                    </>
                  ))}
              </span>
            </div>
          )
        })}
      </div>

      {typingPeer && (
        <div className="flex items-center gap-1.5 border-t border-input px-4 py-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <span className="size-1 animate-bounce rounded-full bg-current" />
            <span
              className="size-1 animate-bounce rounded-full bg-current"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="size-1 animate-bounce rounded-full bg-current"
              style={{ animationDelay: "300ms" }}
            />
          </span>
          {peer.name} is typing
        </div>
      )}

      <form
        className="w-full p-4 pt-0"
        onSubmit={(event) => {
          event.preventDefault()
          handleSend()
        }}
      >
        <InputGroup>
          <InputGroupInput
            value={input}
            placeholder={`Message @${handle}`}
            onChange={(event) => {
              setInput(event.target.value)
              if (event.target.value.trim()) sendTyping()
            }}
            onBlur={() => {
              if (input.trim()) sendTypingStop()
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit" variant="secondary">
              <SendHorizonal />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <div className="flex justify-end pt-1.5">
          <span
            className={cn(
              "text-xs text-muted-foreground",
              isOverLimit && "text-destructive",
            )}
          >
            {length}/{MAX_LENGTH}
          </span>
        </div>
      </form>
    </div>
  )
}
