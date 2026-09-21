"use client"

import { useEffect, useRef, useState } from "react"
import { useLobbyChannel } from "../Providers/Lobby"
import { UserPopover } from "../UserPopup/UserPopover"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Bubble, BubbleContent } from "../ui/bubble"
import { isMentioned } from "@/hooks/useLobby"
import { cn, getInitials } from "@/lib/utils"

const formatTime = (timestamp: string) =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp))

type ActivePopover = {
  messageId: string
  anchorEl: HTMLElement
  align: "start" | "end"
}

export const MessageList = () => {
  const {
    messages,
    user,
    isBlockedByMe,
    blockers,
    focusMessageId,
    focusNonce,
  } = useLobbyChannel()
  const [activePopover, setActivePopover] = useState<ActivePopover | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!focusMessageId) return

    const element = document.getElementById(`message-${focusMessageId}`)
    if (!element) return

    element.scrollIntoView({ behavior: "smooth", block: "center" })
    element.classList.add("highlight-message")
    const timeout = setTimeout(() => {
      element.classList.remove("highlight-message")
    }, 2000)

    return () => clearTimeout(timeout)
  }, [focusMessageId, focusNonce])

  const visibleMessages = messages.filter(
    (message) =>
      !isBlockedByMe(message.sender_id) &&
      !blockers.includes(message.sender_id),
  )
  const activeMessage = activePopover
    ? visibleMessages.find((m) => m.id === activePopover.messageId)
    : undefined

  return (
    <ul className="flex h-full w-full flex-1 flex-col gap-4 overflow-y-auto border-2 border-input rounded-sm p-6 mb-5">
      {visibleMessages.map((message) => {
        const isOwn = message.sender_id === user?.id
        const isMentionedMessage =
          !!user &&
          message.sender_id !== user.id &&
          isMentioned(message.text, user)

        return (
          <li
            key={message.id}
            id={`message-${message.id}`}
            className={cn(
              "flex max-w-[80%] scroll-m-10 flex-col gap-2 rounded-md",
              isOwn ? "items-end self-end" : "items-start self-start",
            )}
          >
            <Bubble align={isOwn ? "end" : "start"}>
              <BubbleContent
                className={cn(
                  isMentionedMessage &&
                    "bg-linear-to-r from-primary/20 via-primary/10 to-transparent",
                )}
              >
                {message.text}
              </BubbleContent>
            </Bubble>
            <div
              className={cn(
                "flex items-center gap-1.5",
                isOwn ? "flex-row-reverse" : "",
              )}
            >
              <button
                type="button"
                aria-label={`View ${message.sender_name}`}
                className="cursor-pointer"
                onClick={(event) => {
                  const anchorEl = event.currentTarget

                  setActivePopover((prev) =>
                    prev?.messageId === message.id
                      ? null
                      : {
                          messageId: message.id,
                          anchorEl,
                          align: isOwn ? "end" : "start",
                        },
                  )
                }}
              >
                <Avatar className="size-5">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(message.sender_name)}
                  </AvatarFallback>
                </Avatar>
              </button>
              <span className="text-xs font-medium">{message.sender_name}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatTime(message.created_at)}
              </span>
            </div>
          </li>
        )
      })}
      <div ref={bottomRef} />
      {activeMessage && activePopover && (
        <UserPopover
          userId={activeMessage.sender_id}
          name={activeMessage.sender_name}
          username={activeMessage.username}
          anchorEl={activePopover.anchorEl}
          align={activePopover.align}
          onClose={() => setActivePopover(null)}
        />
      )}
    </ul>
  )
}
