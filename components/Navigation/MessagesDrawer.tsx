"use client"

import { Loader2, X } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"
import { createPortal } from "react-dom"
import type { InboxConversation } from "@/hooks/useInbox"
import { getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback } from "../ui/avatar"

const formatTime = (timestamp: string) =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp))

type MessagesDrawerProps = {
  isOpen: boolean
  onClose: () => void
  onOpenConversation: (conversationId: string) => void
  conversations: InboxConversation[]
  isLoading: boolean
}

export const MessagesDrawer = ({
  isOpen,
  onClose,
  onOpenConversation,
  conversations,
  isLoading,
}: MessagesDrawerProps) => {

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        className="flex h-full w-full max-w-sm animate-in flex-col border-l-2 border-input bg-background p-4 shadow-lg slide-in-from-right duration-200"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Messages</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close messages"
            className="cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <span className="p-2 text-xs text-muted-foreground">
              No conversations yet
            </span>
          ) : (
            conversations.map((conversation) => (
              <Link
                key={conversation.conversationId}
                href={`/dms/${conversation.peerId}`}
                onClick={() => onOpenConversation(conversation.conversationId)}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
              >
                <Avatar className="size-9">
                  <AvatarFallback>
                    {getInitials(conversation.peerName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {conversation.peerName}
                    </span>
                    {conversation.lastMessage && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatTime(conversation.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs text-muted-foreground">
                      {conversation.lastMessage
                        ? conversation.lastMessage.text
                        : "No messages yet"}
                    </p>
                    {conversation.unread > 0 && (
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                        {conversation.unread > 9 ? "9+" : conversation.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </aside>
    </div>,
    document.body,
  )
}