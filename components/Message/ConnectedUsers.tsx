"use client"

import { useLobbyChannel } from "../Providers/Lobby"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { getInitials } from "@/lib/utils"

const MAX_AVATARS = 5

export const ConnectedUsers = () => {
  const { connectedUsers } = useLobbyChannel()
  const overflow = connectedUsers.length - MAX_AVATARS

  return (
    <div className="flex items-center justify-between gap-2 border-2 border-input rounded-sm px-3 py-2">
      <span className="text-sm text-muted-foreground">
        {connectedUsers.length === 0
          ? "Connecting..."
          : `${connectedUsers.length} connected`}
      </span>
      <div className="flex -space-x-2">
        {connectedUsers.slice(0, MAX_AVATARS).map((user) => (
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
        {overflow > 0 && (
          <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground ring-2 ring-background">
            +{overflow}
          </div>
        )}
      </div>
    </div>
  )
}
