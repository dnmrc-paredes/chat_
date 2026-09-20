"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type UIEvent,
} from "react"
import { ArrowLeft, Loader2, SendHorizonal } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { browserClient } from "@/lib/supabase/client"
import { cn, deriveHandle, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Bubble, BubbleContent } from "../ui/bubble"

const PAGE_SIZE = 40
const INITIAL_PAGE_SIZE = 30
const MAX_LENGTH = 500

export type DMMessage = {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  text: string
  created_at: string
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
}: DMThreadProps) => {
  const [messages, setMessages] = useState<DMMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(
    initialMessages.length === INITIAL_PAGE_SIZE,
  )
  const containerRef = useRef<HTMLDivElement | null>(null)
  const oldestRef = useRef<DMMessage | null>(initialMessages[0] ?? null)
  const scrollDataRef = useRef({ scrollHeight: 0, scrollTop: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  const markAsRead = useCallback(() => {
    browserClient()
      .from("dm_messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .eq("is_read", false)
  }, [conversationId, currentUserId])

  useEffect(() => {
    markAsRead()
  }, [markAsRead])

  useEffect(() => {
    const channel = browserClient()
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
          if (message.sender_id !== currentUserId) markAsRead()
        },
      )
      .subscribe()

    return () => {
      browserClient().removeChannel(channel)
    }
  }, [conversationId, currentUserId, markAsRead])

  const loadOlder = useCallback(async () => {
    const oldest = oldestRef.current
    if (!oldest || isLoadingOlder || !hasMore) return

    const el = containerRef.current
    scrollDataRef.current = {
      scrollHeight: el?.scrollHeight ?? 0,
      scrollTop: el?.scrollTop ?? 0,
    }
    setIsLoadingOlder(true)

    const { data, error } = await browserClient()
      .from("dm_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .lt("created_at", oldest.created_at)
      .limit(PAGE_SIZE)

    if (!error && data) {
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
        const delta = container.scrollHeight - scrollDataRef.current.scrollHeight
        container.scrollTop = scrollDataRef.current.scrollTop + delta
      })
    }

    setIsLoadingOlder(false)
  }, [conversationId, hasMore, isLoadingOlder])

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (event.currentTarget.scrollTop < 32) loadOlder()
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    if (text.length > MAX_LENGTH) {
      toast("Message is too long.")
      return
    }

    setInput("")
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

    const message = data as DMMessage
    setMessages((prev) =>
      prev.some((existing) => existing.id === message.id)
        ? prev
        : [...prev, message],
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
        <Link
          href="/home"
          aria-label="Back to lobby"
          className="flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-muted"
        >
          <ArrowLeft size={20} />
        </Link>
        <Avatar className="size-9">
          <AvatarFallback>{getInitials(peer.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{peer.name}</span>
          <span className="truncate text-xs text-muted-foreground">@{handle}</span>
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

          return (
            <div
              key={message.id}
              className={cn(
                "flex max-w-[80%] flex-col gap-1",
                isOwn ? "items-end self-end" : "items-start self-start",
              )}
            >
              <Bubble align={isOwn ? "end" : "start"} variant={isOwn ? "default" : "secondary"}>
                <BubbleContent>{message.text}</BubbleContent>
              </Bubble>
              <span className="text-[10px] text-muted-foreground">
                {formatTime(message.created_at)}
              </span>
            </div>
          )
        })}
      </div>

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
            onChange={(event) => setInput(event.target.value)}
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