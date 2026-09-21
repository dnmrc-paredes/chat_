"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  RealtimeChannel,
  RealtimePresenceState,
  User,
} from "@supabase/supabase-js"
import { toast } from "sonner"
import { LOBBY_CHANNEL } from "@/lib/supabase/broadcast"
import { browserClient } from "@/lib/supabase/client"
import { deriveHandle } from "@/lib/utils"

export type ChatMessage = {
  id: string
  sender_id: string
  sender_name: string
  username?: string
  text: string
  created_at: string
}

export type ConnectedUser = {
  user_id: string
  name: string
}

export type Mention = {
  id: string
  sender_id: string
  sender_name: string
  text: string
  created_at: string
}

export type Friendship = {
  user_a: string
  user_b: string
  status: "pending" | "accepted"
  created_at?: string
}

export type Block = {
  user_id: string
  blocked_user_id: string
}

export type FriendStatus = "none" | "outgoing" | "incoming" | "accepted"

type PresencePayload = ConnectedUser

type FriendRequestPayload = {
  target_id: string
  sender_id: string
  sender_name: string
}

type FriendAcceptedPayload = {
  target_id: string
  sender_id: string
  sender_name: string
}

type UserBlockedPayload = {
  target_id: string
  sender_id: string
}

export const MESSAGE_EVENT = "message_sent"
export const FRIEND_REQUEST_EVENT = "friend_request"
export const FRIEND_ACCEPTED_EVENT = "friend_accepted"
export const USER_BLOCKED_EVENT = "user_blocked"
const MAX_MESSAGES = 100
const MAX_MENTIONS = 50

const userName = (user: User) =>
  (user.user_metadata?.name as string | undefined) ||
  (user.email as string | undefined) ||
  "Guest"

export const userHandle = (user: User) =>
  deriveHandle(
    user.user_metadata?.username as string | undefined,
    userName(user),
    user.id,
  )

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export const isMentioned = (text: string, user: User) =>
  new RegExp(`(?:^|\\s)@${escapeRegExp(userHandle(user))}(?:\\s|$)`).test(text)

export const useLobby = (user: User | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [blockers, setBlockers] = useState<string[]>([])
  const [mentions, setMentions] = useState<Mention[]>([])
  const [unreadMentions, setUnreadMentions] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [inputText, setInputText] = useState("")
  const [focusMessageId, setFocusMessageId] = useState<string | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const hiddenSendersRef = useRef(new Set<string>())

  const handlePresenceSync = useCallback((channel: RealtimeChannel) => {
    const state =
      channel.presenceState() as RealtimePresenceState<PresencePayload>
    const users = Object.values(state)
      .flat()
      .map(({ user_id, name }) => ({ user_id, name }))
      .filter(
        (entry, index, all) =>
          all.findIndex((other) => other.user_id === entry.user_id) === index,
      )

    setConnectedUsers(users)
  }, [])

  const refreshRelations = useCallback(() => {
    if (!user) return

    const supabase = browserClient()

    supabase
      .from("friendships")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          return
        }
        setFriendships(data as Friendship[])
      })

    supabase
      .from("blocks")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          return
        }
        setBlocks(data as Block[])
      })

    supabase.rpc("get_my_blockers").then(({ data, error }) => {
      if (error) {
        console.error(error)
        return
      }
      setBlockers(
        ((data as { user_id: string }[] | null) ?? []).map(
          (row) => row.user_id,
        ),
      )
    })
  }, [user])

  useEffect(() => {
    refreshRelations()
  }, [refreshRelations])

  useEffect(() => {
    const hidden = new Set<string>()

    for (const block of blocks) hidden.add(block.blocked_user_id)
    for (const blocker of blockers) hidden.add(blocker)

    hiddenSendersRef.current = hidden
  }, [blocks, blockers])

  useEffect(() => {
    const channel = browserClient()
      .channel(LOBBY_CHANNEL, {
        config: { broadcast: { self: true } },
      })
      .on("broadcast", { event: MESSAGE_EVENT }, ({ payload }) => {
        const message = payload as ChatMessage

        if (hiddenSendersRef.current.has(message.sender_id)) return

        setMessages((prev) =>
          prev.some((existing) => existing.id === message.id)
            ? prev
            : [...prev, message].slice(-MAX_MESSAGES),
        )

        if (
          user &&
          message.sender_id !== user.id &&
          isMentioned(message.text, user)
        ) {
          toast(`${message.sender_name} mentioned you.`)
          setMentions((prev) =>
            prev.some((mention) => mention.id === message.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: message.id,
                    sender_id: message.sender_id,
                    sender_name: message.sender_name,
                    text: message.text,
                    created_at: message.created_at,
                  },
                ].slice(-MAX_MENTIONS),
          )
          setUnreadMentions((prev) => prev + 1)
        }
      })
      .on("broadcast", { event: FRIEND_REQUEST_EVENT }, ({ payload }) => {
        const { target_id, sender_name } = payload as FriendRequestPayload

        if (target_id === user?.id) {
          toast(`${sender_name} sent you a friend request.`)
          refreshRelations()
        }
      })
      .on("broadcast", { event: FRIEND_ACCEPTED_EVENT }, ({ payload }) => {
        const { target_id, sender_name } = payload as FriendAcceptedPayload

        if (target_id === user?.id) {
          toast(`You are now friends with ${sender_name}.`)
          refreshRelations()
        }
      })
      .on("broadcast", { event: USER_BLOCKED_EVENT }, ({ payload }) => {
        const { target_id, sender_id } = payload as UserBlockedPayload

        if (target_id === user?.id) {
          toast("You have been blocked by another user.")
          setBlockers((prev) =>
            prev.includes(sender_id) ? prev : [...prev, sender_id],
          )
        }
      })
      .on("presence", { event: "sync" }, () => handlePresenceSync(channel))
      .subscribe((status) => {
        const connected = status === "SUBSCRIBED"
        setIsConnected(connected)

        if (connected && user) {
          channel.track({
            user_id: user.id,
            name: userName(user),
          } satisfies PresencePayload)
        }
      })

    channelRef.current = channel

    return () => {
      browserClient().removeChannel(channel)
      channelRef.current = null
      setIsConnected(false)
      setConnectedUsers([])
    }
  }, [user, handlePresenceSync, refreshRelations])

  const sendMessage = useCallback(
    (text: string) => {
      if (!user || !channelRef.current) return

      channelRef.current.send({
        type: "broadcast",
        event: MESSAGE_EVENT,
        payload: {
          id: crypto.randomUUID(),
          sender_id: user.id,
          sender_name: userName(user),
          username: deriveHandle(
            user.user_metadata?.username as string | undefined,
            userName(user),
            user.id,
          ),
          text,
          created_at: new Date().toISOString(),
        } satisfies ChatMessage,
      })
    },
    [user],
  )

  const addFriend = useCallback(
    async (targetId: string) => {
      if (!user || targetId === user.id) return

      let error: Error | null = null

      try {
        ;({ error } = await browserClient()
          .from("friendships")
          .insert({ user_a: user.id, user_b: targetId, status: "pending" }))
      } catch (err) {
        error = err as Error
      }

      if (error) {
        console.error(error)
        toast("Couldn't send friend request.")
        return
      }

      setFriendships((prev) => [
        ...prev,
        { user_a: user.id, user_b: targetId, status: "pending" },
      ])

      channelRef.current?.send({
        type: "broadcast",
        event: FRIEND_REQUEST_EVENT,
        payload: {
          target_id: targetId,
          sender_id: user.id,
          sender_name: userName(user),
        } satisfies FriendRequestPayload,
      })

      toast("Friend request sent.")
    },
    [user],
  )

  const acceptFriend = useCallback(
    async (targetId: string) => {
      if (!user) return

      let error: Error | null = null

      try {
        ;({ error } = await browserClient()
          .from("friendships")
          .update({ status: "accepted" })
          .eq("user_a", targetId)
          .eq("user_b", user.id))
      } catch (err) {
        error = err as Error
      }

      if (error) {
        console.error(error)
        toast("Couldn't accept friend request.")
        return
      }

      setFriendships((prev) =>
        prev.map((friendship) =>
          friendship.user_a === targetId && friendship.user_b === user.id
            ? { ...friendship, status: "accepted" }
            : friendship,
        ),
      )

      channelRef.current?.send({
        type: "broadcast",
        event: FRIEND_ACCEPTED_EVENT,
        payload: {
          target_id: targetId,
          sender_id: user.id,
          sender_name: userName(user),
        } satisfies FriendAcceptedPayload,
      })

      toast("You are now friends.")
    },
    [user],
  )

  const blockUser = useCallback(
    async (targetId: string) => {
      if (!user || targetId === user.id) return

      let error: Error | null = null

      try {
        ;({ error } = await browserClient()
          .from("blocks")
          .insert({ user_id: user.id, blocked_user_id: targetId }))
      } catch (err) {
        error = err as Error
      }

      if (error) {
        console.error(error)
        toast("Couldn't block user.")
        return
      }

      setBlocks((prev) => [
        ...prev,
        { user_id: user.id, blocked_user_id: targetId },
      ])

      const { error: friendshipError } = await browserClient()
        .from("friendships")
        .delete()
        .or(
          `and(user_a.eq.${user.id},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${user.id})`,
        )

      if (friendshipError) {
        console.error(friendshipError)
      }

      setFriendships((prev) =>
        prev.filter(
          (friendship) =>
            !(
              (friendship.user_a === targetId &&
                friendship.user_b === user.id) ||
              (friendship.user_a === user.id && friendship.user_b === targetId)
            ),
        ),
      )

      channelRef.current?.send({
        type: "broadcast",
        event: USER_BLOCKED_EVENT,
        payload: {
          target_id: targetId,
          sender_id: user.id,
        } satisfies UserBlockedPayload,
      })
    },
    [user],
  )

  const unblockUser = useCallback(
    async (targetId: string) => {
      if (!user) return

      let error: Error | null = null

      try {
        ;({ error } = await browserClient()
          .from("blocks")
          .delete()
          .eq("user_id", user.id)
          .eq("blocked_user_id", targetId))
      } catch (err) {
        error = err as Error
      }

      if (error) {
        console.error(error)
        toast("Couldn't unblock user.")
        return
      }

      setBlocks((prev) => prev.filter((b) => b.blocked_user_id !== targetId))
    },
    [user],
  )

  const getFriendStatus = useCallback(
    (targetId: string): FriendStatus => {
      if (!user) return "none"

      const friendship = friendships.find(
        (entry) =>
          (entry.user_a === targetId && entry.user_b === user.id) ||
          (entry.user_a === user.id && entry.user_b === targetId),
      )

      if (!friendship) return "none"
      if (friendship.status === "accepted") return "accepted"
      return friendship.user_a === user.id ? "outgoing" : "incoming"
    },
    [friendships, user],
  )

  const isBlockedByMe = useCallback(
    (targetId: string) => blocks.some((b) => b.blocked_user_id === targetId),
    [blocks],
  )

  const mentionUser = useCallback((handle: string) => {
    setInputText((prev) => {
      const trimmed = prev.trimEnd()
      return `${trimmed ? trimmed + " " : ""}@${handle} `
    })
    document.getElementById("chat-input")?.focus()
  }, [])

  const markMentionsRead = useCallback(() => setUnreadMentions(0), [])

  const clearMentions = useCallback(() => {
    setMentions([])
    setUnreadMentions(0)
  }, [])

  const focusMessage = useCallback((messageId: string) => {
    setFocusMessageId(messageId)
    setFocusNonce((prev) => prev + 1)
  }, [])

  return {
    messages,
    connectedUsers,
    friendships,
    blocks,
    blockers,
    mentions,
    unreadMentions,
    markMentionsRead,
    clearMentions,
    focusMessageId,
    focusNonce,
    focusMessage,
    isConnected,
    inputText,
    setInputText,
    sendMessage,
    mentionUser,
    addFriend,
    acceptFriend,
    blockUser,
    unblockUser,
    getFriendStatus,
    isBlockedByMe,
    user,
  }
}
