"use client"

import { Ban, MessageCircle, User2, UserMinus, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { USER_BLOCKED_EVENT } from "@/hooks/useLobby"
import { useOnlineUsers } from "@/hooks/useOnline"
import { sendLobbyBroadcast } from "@/lib/supabase/broadcast"
import { browserClient } from "@/lib/supabase/client"
import { cn, deriveHandle, formatDate, getInitials } from "@/lib/utils"
import { PresenceDot } from "../Presence/PresenceDot"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button, buttonVariants } from "../ui/button"

export type Friend = {
  id: string
  name: string
  username: string | null
  friendsSince: string | null
}

export type BlockedUser = {
  id: string
  name: string
  username: string | null
  blockedSince: string | null
}

type FriendsListProps = {
  friends: Friend[]
  blocked: BlockedUser[]
  currentUserId: string
}

export const FriendsList = ({
  friends,
  blocked,
  currentUserId,
}: FriendsListProps) => {
  const [list, setList] = useState<Friend[]>(friends)
  const [blockedList, setBlockedList] = useState<BlockedUser[]>(blocked)
  const [selected, setSelected] = useState<Friend | null>(null)
  const onlineIds = useOnlineUsers()

  useEffect(() => {
    if (!selected) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [selected])

  const unfriend = async (friend: Friend) => {
    const { error } = await browserClient()
      .from("friendships")
      .delete()
      .or(
        `and(user_a.eq.${currentUserId},user_b.eq.${friend.id}),and(user_a.eq.${friend.id},user_b.eq.${currentUserId})`,
      )

    if (error) {
      console.error(error)
      toast("Couldn't unfriend.")
      return
    }

    setList((prev) => prev.filter((entry) => entry.id !== friend.id))
    setSelected(null)
    toast(`Removed ${friend.name} from your friends.`)
  }

  const block = async (friend: Friend) => {
    const { error: blockError } = await browserClient()
      .from("blocks")
      .insert({ user_id: currentUserId, blocked_user_id: friend.id })

    if (blockError) {
      console.error(blockError)
      toast("Couldn't block user.")
      return
    }

    await browserClient()
      .from("friendships")
      .delete()
      .or(
        `and(user_a.eq.${currentUserId},user_b.eq.${friend.id}),and(user_a.eq.${friend.id},user_b.eq.${currentUserId})`,
      )

    sendLobbyBroadcast(USER_BLOCKED_EVENT, {
      target_id: friend.id,
      sender_id: currentUserId,
    })

    setList((prev) => prev.filter((entry) => entry.id !== friend.id))
    setBlockedList((prev) => [
      ...prev,
      {
        id: friend.id,
        name: friend.name,
        username: friend.username,
        blockedSince: new Date().toISOString(),
      },
    ])
    setSelected(null)
    toast(`${friend.name} blocked.`)
  }

  const unblock = async (blockedUser: BlockedUser) => {
    const { error } = await browserClient()
      .from("blocks")
      .delete()
      .eq("user_id", currentUserId)
      .eq("blocked_user_id", blockedUser.id)

    if (error) {
      console.error(error)
      toast("Couldn't unblock user.")
      return
    }

    setBlockedList((prev) =>
      prev.filter((entry) => entry.id !== blockedUser.id),
    )
    toast(`Unblocked ${blockedUser.name}.`)
  }

  const count = list.length

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        You have <span className="font-medium text-foreground">{count}</span>{" "}
        friend{count === 1 ? "" : "s"}
      </p>

      {count === 0 ? (
        <p className="rounded-md border-2 border-input p-6 text-center text-sm text-muted-foreground">
          No friends yet — find people and start a chat.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((friend) => (
            <li key={friend.id}>
              <button
                type="button"
                onClick={() => setSelected(friend)}
                aria-label={`Open actions for ${friend.name}`}
                className="flex w-full cursor-pointer items-center gap-3 rounded-md border-2 border-input p-3 text-left hover:bg-muted"
              >
                <div className="relative shrink-0">
                  <Avatar className="size-10">
                    <AvatarFallback>{getInitials(friend.name)}</AvatarFallback>
                  </Avatar>
                  <PresenceDot isOnline={onlineIds.has(friend.id)} />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {friend.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{deriveHandle(friend.username, friend.name, friend.id)}
                  </span>
                </span>
                {friend.friendsSince && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDate(friend.friendsSince)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {blockedList.length > 0 && (
        <section className="flex w-full flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Blocked ({blockedList.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {blockedList.map((blockedUser) => (
              <li
                key={blockedUser.id}
                className="flex w-full items-center gap-3 rounded-md border-2 border-muted p-3"
              >
                <Avatar className="size-10 opacity-60">
                  <AvatarFallback>
                    {getInitials(blockedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {blockedUser.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @
                    {deriveHandle(
                      blockedUser.username,
                      blockedUser.name,
                      blockedUser.id,
                    )}
                  </span>
                </span>
                <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:block">
                  Blocked {formatDate(blockedUser.blockedSince ?? "")}
                </span>
                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={() => unblock(blockedUser)}
                >
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Actions for ${selected.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm rounded-md border border-border bg-background p-5 shadow-lg"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar className="size-10">
                    <AvatarFallback>
                      {getInitials(selected.name)}
                    </AvatarFallback>
                  </Avatar>
                  <PresenceDot isOnline={onlineIds.has(selected.id)} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {selected.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @
                    {deriveHandle(
                      selected.username,
                      selected.name,
                      selected.id,
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    onlineIds.has(selected.id)
                      ? "bg-green-500"
                      : "bg-muted-foreground/50",
                  )}
                />
                {onlineIds.has(selected.id) ? "Online" : "Offline"}
              </span>
              {selected.friendsSince && (
                <span>Friends since {formatDate(selected.friendsSince)}</span>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={`/profile/${selected.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <User2 />
                View Profile
              </Link>
              <Link
                href={`/dms/${selected.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <MessageCircle />
                Message
              </Link>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => unfriend(selected)}
              >
                <UserMinus />
                Unfriend
              </Button>
              <Button
                variant="destructive"
                className="cursor-pointer"
                onClick={() => block(selected)}
              >
                <Ban />
                Block
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
