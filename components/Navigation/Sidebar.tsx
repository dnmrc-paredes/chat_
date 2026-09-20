"use client"

import { Bell, Home, LogOut, User2, X } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { browserClient } from "@/lib/supabase/client"
import { useLobbyChannel } from "../Providers/Lobby"
import { Button } from "../ui/button"

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
  const { mentions, unreadMentions, markMentionsRead, clearMentions, focusMessage } =
    useLobbyChannel()
  const [isOpen, setIsOpen] = useState(false)

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
    }
    setIsOpen((prev) => !prev)
  }

  return (
    <div className="w-full flex relative items-center justify-center">
      <ul className="flex items-center justify-center gap-4">
        {navigations.map((item) => {
          return (
            <li key={item.name}>
              <Link
                href={item.href}
                aria-label={item.name}
                className="cursor-pointer"
              >
                {item.icon}
              </Link>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Mentions"
            aria-expanded={isOpen}
            className="relative cursor-pointer"
          >
            <Bell size={20} />
            {unreadMentions > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                {unreadMentions > 9 ? "9+" : unreadMentions}
              </span>
            )}
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className="cursor-pointer"
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

              <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
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
              </div>

              {mentions.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearMentions}
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
    </div>
  )
}