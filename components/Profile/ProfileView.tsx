"use client"

import type { Friendship } from "@/hooks/useLobby"
import { useRelations } from "@/hooks/useRelations"
import { deriveHandle, formatDate, getInitials } from "@/lib/utils"
import Link from "next/link"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button, buttonVariants } from "../ui/button"

export type Profile = {
  id: string
  name: string
  username: string | null
  created_at: string
}

type ProfileViewProps = {
  profile: Profile
  currentUserId: string
  initialFriendship: Friendship | null
  initialBlocked: boolean
}

export const ProfileView = ({
  profile,
  currentUserId,
  initialFriendship,
  initialBlocked,
}: ProfileViewProps) => {
  const isSelf = currentUserId === profile.id
  const {
    status,
    isBlocked,
    friendsSince,
    addFriend,
    acceptFriend,
    removeFriend,
    block,
    unblock,
  } = useRelations(profile.id, initialFriendship, initialBlocked)
  const handle = deriveHandle(profile.username, profile.name, profile.id)

  return (
    <div className="flex w-full flex-col gap-5 rounded-md border-2 border-input p-4">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarFallback className="text-xl">
            {getInitials(profile.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-lg font-semibold">{profile.name}</h1>
          <p className="truncate text-sm text-muted-foreground">@{handle}</p>
        </div>

        {isSelf && (
          <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            This is you
          </span>
        )}
      </div>

      <dl className="flex w-full flex-col gap-2 rounded-md bg-muted p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Joined</dt>
          <dd>{formatDate(profile.created_at)}</dd>
        </div>
      </dl>

      {!isSelf &&
        (status === "accepted" ? (
          <div className="flex flex-col gap-3">
            {friendsSince && (
              <p className="text-sm text-muted-foreground">
                Friends since {formatDate(friendsSince)}
              </p>
            )}
            <div className="flex w-full flex-col gap-2">
              <Link
                href={`/dms/${profile.id}`}
                className={buttonVariants({ className: "w-full" })}
              >
                Message
              </Link>
              <Button
                variant="outline"
                className="w-full"
                onClick={removeFriend}
              >
                Remove Friend
              </Button>
              {isBlocked ? (
                <Button variant="outline" className="w-full" onClick={unblock}>
                  Unblock
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={block}
                >
                  Block
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {status === "incoming" ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={acceptFriend}
              >
                Accept Request
              </Button>
            ) : status === "outgoing" ? (
              <Button variant="secondary" className="w-full" disabled>
                Request Sent
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="w-full"
                onClick={addFriend}
              >
                Add Friend
              </Button>
            )}
            {isBlocked ? (
              <Button variant="outline" className="w-full" onClick={unblock}>
                Unblock
              </Button>
            ) : (
              <Button variant="destructive" className="w-full" onClick={block}>
                Block
              </Button>
            )}
          </div>
        ))}
    </div>
  )
}
