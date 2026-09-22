"use client"

import { useLayoutEffect, useRef, useCallback, type UIEvent } from "react"

type UseDMScrollProps = {
  messages: unknown[]
  loadOlder: () => Promise<void>
  currentUserId: string
}

type UseDMScrollReturn = {
  containerRef: React.RefObject<HTMLDivElement | null>
  handleScroll: (event: UIEvent<HTMLDivElement>) => void
}

export function useDMScroll({
  messages,
  loadOlder,
  currentUserId,
}: UseDMScrollProps): UseDMScrollReturn {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollDataRef = useRef({ scrollHeight: 0, scrollTop: 0 })
  const nearBottomRef = useRef(true)
  const restoreScrollRef = useRef(false)
  const scrollToBottomRef = useRef(false)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (restoreScrollRef.current) {
      restoreScrollRef.current = false
      container.scrollTop =
        scrollDataRef.current.scrollTop +
        (container.scrollHeight - scrollDataRef.current.scrollHeight)
    } else if (scrollToBottomRef.current) {
      scrollToBottomRef.current = false
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useLayoutEffect(() => {
    const el = containerRef.current
    const lastMessage = messages.at(-1)
    if (!el || !lastMessage) return

    const isOwn =
      (lastMessage as { sender_id: string }).sender_id === currentUserId
    if (isOwn || nearBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, currentUserId])

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget
      nearBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 120
      if (el.scrollTop < 32) loadOlder()
    },
    [loadOlder],
  )

  return {
    containerRef,
    handleScroll,
  }
}
