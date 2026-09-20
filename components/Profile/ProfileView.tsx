"use client"

import type { Friendship } from "@/hooks/useLobby"
import { useRelations } from "@/hooks/useRelations"
import { deriveHandle, getInitials } from "@/lib/utils"
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

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

export const ProfileView = ({
  profile,
  currentUserId,
  initialFriendship,
  initialBlocked,
}: ProfileViewProps) => {
  const isSelf = currentUserId === profile.id
  const { status, isBlocked, friendsSince, addFriend, acceptFriend, removeFriend, block, unblock } =
    useRelations(profile.id, initialFriendship, initialBlocked)
  const handle = deriveHandle(profile.username, profile.name, profile.id)

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-md border-2 border-input p-8">
      <Avatar className="size-24">
        <AvatarFallback className="text-2xl">{getInitials(profile.name)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold">{profile.name}</h1>
        <p className="text-sm text-muted-foreground">@{handle}</p>
      </div>

      {isSelf && (
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          This is you
        </span>
      )}

      <dl className="flex w-full flex-col gap-2 rounded-md bg-muted p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Joined</dt>
          <dd>{formatDate(profile.created_at)}</dd>
        </div>
      </dl>

      {!isSelf &&
        (status === "accepted" ? (
          <div className="flex flex-col items-center gap-3">
            {friendsSince && (
              <p className="text-sm text-muted-foreground">
                Friends since {formatDate(friendsSince)}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <Link href={`/home?to=${handle}`} className={buttonVariants()}>
                Message
              </Link>
              <Button variant="outline" onClick={removeFriend}>
                Remove Friend
              </Button>
              {isBlocked ? (
                <Button variant="outline" onClick={unblock}>
                  Unblock
                </Button>
              ) : (
                <Button variant="destructive" onClick={block}>
                  Block
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {status === "incoming" ? (
              <Button variant="secondary" onClick={acceptFriend}>
                Accept Request
              </Button>
            ) : status === "outgoing" ? (
              <Button variant="secondary" disabled>
                Request Sent
              </Button>
            ) : (
              <Button variant="secondary" onClick={addFriend}>
                Add Friend
              </Button>
            )}
            {isBlocked ? (
              <Button variant="outline" onClick={unblock}>
                Unblock
              </Button>
            ) : (
              <Button variant="destructive" onClick={block}>
                Block
              </Button>
            )}
          </div>
        ))}
    </div>
  )
}