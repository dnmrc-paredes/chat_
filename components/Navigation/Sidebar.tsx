"use client"

import { Bell, Home, LogOut, MessagesSquare, User2, X } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { browserClient } from "@/lib/supabase/client"
import { useInbox } from "@/hooks/useInbox"
import { useNotifications } from "@/hooks/useNotifications"
import { cn, getInitials } from "@/lib/utils"
import { useLobbyChannel } from "../Providers/Lobby"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import { MessagesDrawer } from "./MessagesDrawer"

const navigations = [
  {
    name: "Friends",
    icon: <User2 size={20} />,
    href: "/friends",
  },
  {
    name: "Home",
    icon: <Home size={20} />,
    href: "/home",
  },
]

const formatTime = (timestamp: string) =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp))

export const Sidebar = () => {
  const {
    user,
    mentions,
    unreadMentions,
    markMentionsRead,
    clearMentions,
    focusMessage,
  } = useLobbyChannel()
  const { notifications, unread, markAllRead, clearAll } = useNotifications()
  const {
    conversations,
    unread: unreadMessages,
    isLoading,
    markConversationRead,
  } = useInbox()
  const [isOpen, setIsOpen] = useState(false)
  const [isMessagesOpen, setIsMessagesOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handleLogout = async () => {
    await browserClient().auth.signOut()
    redirect("/")
  }

  const handleToggle = () => {
    if (!isOpen) {
      markMentionsRead()
      markAllRead()
    }
    setIsOpen((prev) => !prev)
  }

  return (
    <div className="w-full flex relative items-center justify-center">
      <ul className="flex items-center justify-center gap-4">
        {user && (
          <li>
            <Link
              href={`/profile/${user.id}`}
              aria-label="My profile"
              className="flex size-10 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
            >
              <Avatar className="size-6">
                <AvatarFallback className="text-[10px]">
                  {getInitials(
                    (user.user_metadata?.name as string | undefined) ??
                      user.email ??
                      "?",
                  )}
                </AvatarFallback>
              </Avatar>
            </Link>
          </li>
        )}
        {navigations.map((item) => {
          return (
            <li key={item.name}>
              <Link
                href={item.href}
                aria-label={item.name}
                className="flex size-10 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
              >
                {item.icon}
              </Link>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            onClick={() => setIsMessagesOpen(true)}
            aria-label="Messages"
            aria-expanded={isMessagesOpen}
            className="relative flex size-10 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
          >
            <MessagesSquare size={20} />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Mentions"
            aria-expanded={isOpen}
            className="relative flex size-10 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
          >
            <Bell size={20} />
            {unreadMentions + unread > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                {unreadMentions + unread > 9 ? "9+" : unreadMentions + unread}
              </span>
            )}
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className="flex size-10 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
          >
            <LogOut size={20} />
          </button>
        </li>
      </ul>

      {isOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) setIsOpen(false)
            }}
          >
            <div className="flex w-full max-w-md flex-col gap-3 rounded-md border border-border bg-background p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Notifications</h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                  className="cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex max-h-96 flex-col gap-4 overflow-y-auto">
                <section className="flex flex-col gap-1">
                  <h3 className="px-2 text-[11px] font-medium text-muted-foreground">
                    Friend requests
                  </h3>
                  {notifications.length === 0 ? (
                    <span className="p-2 text-xs text-muted-foreground">
                      Nothing here yet
                    </span>
                  ) : (
                    notifications.map((notification) => (
                      <Link
                        key={notification.id}
                        href={
                          notification.sender_id
                            ? `/profile/${notification.sender_id}`
                            : "#"
                        }
                        className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-left hover:bg-muted"
                      >
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            notification.is_read
                              ? "bg-transparent"
                              : "bg-primary",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs">
                          {notification.kind === "friend_request"
                            ? `${notification.sender_name} sent you a friend request.`
                            : `${notification.sender_name} accepted your friend request.`}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatTime(notification.created_at)}
                        </span>
                      </Link>
                    ))
                  )}
                </section>

                <section className="flex flex-col gap-1">
                  <h3 className="px-2 text-[11px] font-medium text-muted-foreground">
                    Mentions
                  </h3>
                  {mentions.length === 0 ? (
                    <span className="p-2 text-xs text-muted-foreground">
                      No mentions yet
                    </span>
                  ) : (
                    mentions.map((mention) => (
                      <button
                        key={mention.id}
                        type="button"
                        onClick={() => {
                          focusMessage(mention.id)
                          setIsOpen(false)
                        }}
                        className="flex cursor-pointer flex-col gap-0.5 rounded-md p-2 text-left hover:bg-muted"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">
                            {mention.sender_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(mention.created_at)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {mention.text}
                        </p>
                      </button>
                    ))
                  )}
                </section>
              </div>

              {(mentions.length > 0 || notifications.length > 0) && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearMentions()
                      clearAll()
                    }}
                    className="cursor-pointer"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}

      <MessagesDrawer
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
        onOpenConversation={markConversationRead}
        conversations={conversations}
        isLoading={isLoading}
      />
    </div>
  )
}
