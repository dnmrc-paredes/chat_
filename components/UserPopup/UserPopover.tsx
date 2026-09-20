"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useLobbyChannel } from "../Providers/Lobby"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import { cn, deriveHandle, getInitials } from "@/lib/utils"

const PANEL_WIDTH = 256

type UserPopoverProps = {
  userId: string
  name: string
  username?: string
  anchorEl: HTMLElement
  align: "start" | "end"
  onClose: () => void
}

export const UserPopover = ({
  userId,
  name,
  username,
  anchorEl,
  align,
  onClose,
}: UserPopoverProps) => {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const { user, getFriendStatus, isBlockedByMe, addFriend, acceptFriend, blockUser, unblockUser, mentionUser } =
    useLobbyChannel()

  const isSelf = userId === user?.id
  const handle = deriveHandle(username, name, userId)
  const friendStatus = getFriendStatus(userId)
  const isBlocked = isBlockedByMe(userId)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("scroll", onClose, true)
    window.addEventListener("resize", onClose)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("scroll", onClose, true)
      window.removeEventListener("resize", onClose)
    }
  }, [onClose])

  if (!anchorEl) return null

  const rect = anchorEl.getBoundingClientRect()
  let left =
    align === "end" ? rect.right - PANEL_WIDTH : rect.left
  left = Math.max(8, Math.min(left, window.innerWidth - PANEL_WIDTH - 8))
  const top = rect.bottom + 8

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      className="fixed z-50 flex w-64 flex-col gap-3 rounded-md border border-border bg-background p-3 shadow-lg"
      style={{ left, top }}
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-xs text-muted-foreground">
            @{handle}
          </span>
        </div>
      </div>

      {isSelf ? (
        <span className="text-xs text-muted-foreground">This is you</span>
      ) : (
        <div className="flex flex-col gap-2">
          {friendStatus === "accepted" && (
            <Button disabled variant="secondary" className="justify-between">
              Friends
            </Button>
          )}
          {friendStatus === "outgoing" && (
            <Button disabled variant="secondary" className="justify-between">
              Request Sent
            </Button>
          )}
          {friendStatus === "incoming" && (
            <Button
              variant="secondary"
              onClick={() => acceptFriend(userId)}
              className="justify-between"
            >
              Accept Request
            </Button>
          )}
          {friendStatus === "none" && (
            <Button
              variant="secondary"
              onClick={() => addFriend(userId)}
              className="justify-between"
            >
              Add Friend
            </Button>
          )}

          {isBlocked ? (
            <Button
              variant="outline"
              onClick={() => unblockUser(userId)}
              className="justify-between"
            >
              Unblock
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => blockUser(userId)}
              className="justify-between"
            >
              Block
            </Button>
          )}

          <Button
            className={cn("justify-between")}
            onClick={() => {
              mentionUser(handle)
              onClose()
            }}
          >
            Mention
          </Button>
        </div>
      )}
    </div>,
    document.body,
  )
}