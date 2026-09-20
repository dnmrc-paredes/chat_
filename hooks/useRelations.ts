"use client"

import { useCallback, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { toast } from "sonner"
import { useSession } from "@/hooks/useAuth"
import {
  FRIEND_ACCEPTED_EVENT,
  FRIEND_REQUEST_EVENT,
  USER_BLOCKED_EVENT,
  type Block,
  type FriendStatus,
  type Friendship,
} from "@/hooks/useLobby"
import { sendLobbyBroadcast } from "@/lib/supabase/broadcast"
import { browserClient } from "@/lib/supabase/client"

const nameOf = (user: User) =>
  (user.user_metadata?.name as string | undefined) ||
  (user.email as string | undefined) ||
  "Guest"

export const useRelations = (
  targetId: string,
  initialFriendship: Friendship | null = null,
  initialBlocked = false,
) => {
  const { user } = useSession()
  const [friendship, setFriendship] = useState<Friendship | null>(
    initialFriendship,
  )
  const [isBlocked, setIsBlocked] = useState(initialBlocked)

  const refresh = useCallback(() => {
    if (!user || !targetId) return

    browserClient()
      .from("friendships")
      .select("*")
      .or(
        `and(user_a.eq.${user.id},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${user.id})`,
      )
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          return
        }
        setFriendship((data as Friendship | null) ?? null)
      })

    browserClient()
      .from("blocks")
      .select("*")
      .eq("user_id", user.id)
      .eq("blocked_user_id", targetId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          return
        }
        setIsBlocked((data as Block | null) !== null)
      })
  }, [user, targetId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const status: FriendStatus = !friendship
    ? "none"
    : friendship.status === "accepted"
      ? "accepted"
      : friendship.user_a === user?.id
        ? "outgoing"
        : "incoming"

  const friendsSince =
    friendship?.status === "accepted" ? (friendship.created_at ?? null) : null

  const addFriend = useCallback(async () => {
    if (!user || targetId === user.id) return

    try {
      const { error } = await browserClient()
        .from("friendships")
        .insert({ user_a: user.id, user_b: targetId, status: "pending" })

      if (error) {
        console.error(error)
        toast("Couldn't send friend request.")
        return
      }
    } catch (error) {
      console.error(error)
      toast("Couldn't send friend request.")
      return
    }

    setFriendship({ user_a: user.id, user_b: targetId, status: "pending" })
    sendLobbyBroadcast(FRIEND_REQUEST_EVENT, {
      target_id: targetId,
      sender_id: user.id,
      sender_name: nameOf(user),
    })
    toast("Friend request sent.")
  }, [user, targetId])

  const acceptFriend = useCallback(async () => {
    if (!user || status !== "incoming") return

    try {
      const { error } = await browserClient()
        .from("friendships")
        .update({ status: "accepted" })
        .eq("user_a", targetId)
        .eq("user_b", user.id)

      if (error) {
        console.error(error)
        toast("Couldn't accept friend request.")
        return
      }
    } catch (error) {
      console.error(error)
      toast("Couldn't accept friend request.")
      return
    }

    setFriendship({ user_a: targetId, user_b: user.id, status: "accepted" })
    sendLobbyBroadcast(FRIEND_ACCEPTED_EVENT, {
      target_id: targetId,
      sender_id: user.id,
      sender_name: nameOf(user),
    })
    toast("You are now friends.")
  }, [user, targetId, status])

  const removeFriend = useCallback(async () => {
    if (!user || status !== "accepted") return

    try {
      const { error } = await browserClient()
        .from("friendships")
        .delete()
        .or(
          `and(user_a.eq.${user.id},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${user.id})`,
        )

      if (error) {
        console.error(error)
        toast("Couldn't remove friend.")
        return
      }
    } catch (error) {
      console.error(error)
      toast("Couldn't remove friend.")
      return
    }

    setFriendship(null)
    toast("Friend removed.")
  }, [user, targetId, status])

  const block = useCallback(async () => {
    if (!user || targetId === user.id) return

    try {
      const { error } = await browserClient()
        .from("blocks")
        .insert({ user_id: user.id, blocked_user_id: targetId })

      if (error) {
        console.error(error)
        toast("Couldn't block user.")
        return
      }
    } catch (error) {
      console.error(error)
      toast("Couldn't block user.")
      return
    }

    setIsBlocked(true)
    sendLobbyBroadcast(USER_BLOCKED_EVENT, {
      target_id: targetId,
      sender_id: user.id,
    })
  }, [user, targetId])

  const unblock = useCallback(async () => {
    if (!user) return

    try {
      const { error } = await browserClient()
        .from("blocks")
        .delete()
        .eq("user_id", user.id)
        .eq("blocked_user_id", targetId)

      if (error) {
        console.error(error)
        toast("Couldn't unblock user.")
        return
      }
    } catch (error) {
      console.error(error)
      toast("Couldn't unblock user.")
      return
    }

    setIsBlocked(false)
  }, [user, targetId])

  return {
    status,
    isBlocked,
    friendsSince,
    addFriend,
    acceptFriend,
    removeFriend,
    block,
    unblock,
  }
}
