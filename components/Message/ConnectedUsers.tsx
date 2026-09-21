"use client"

import { useLobbyChannel } from "../Providers/Lobby"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { getInitials } from "@/lib/utils"

const MAX_AVATARS = 10

const compactCount = (count: number) => {
  if (count >= 1_000_000_000) return `${Math.floor(count / 1_000_000_000)}B`
  if (count >= 1_000_000) return `${Math.floor(count / 1_000_000)}M`
  if (count >= 1_000) return `${Math.floor(count / 1_000)}K`
  return `${count}`
}

export const ConnectedUsers = () => {
  const { connectedUsers } = useLobbyChannel()
  const shown = connectedUsers.slice(0, MAX_AVATARS)
  const total = connectedUsers.length
  const overflow = total > MAX_AVATARS ? compactCount(Math.floor(total / 10) * 10) : ""

  return (
    <div className="flex items-center justify-between gap-2 border-2 border-input rounded-sm px-3 py-2">
      <span className="text-sm text-muted-foreground">
        {total === 0 ? "Connecting..." : `${total} connected`}
      </span>
      <div className="flex items-center -space-x-2">
        {shown.map((user) => (
          <Avatar
            key={user.user_id}
            className="size-6 ring-2 ring-background"
            title={user.name}
          >
            <AvatarFallback className="text-[10px]">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {overflow && (
          <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground ring-2 ring-background">
            {overflow}+
          </div>
        )}
      </div>
    </div>
  )
}
