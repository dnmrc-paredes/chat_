import { notFound, redirect } from "next/navigation"
import { BlockedState } from "@/components/Blocking/BlockedState"
import { DMThread, type DMMessage, type DMPeer } from "@/components/DM/DMThread"
import { serverClient } from "@/lib/supabase/server"
import { conversationPair } from "@/lib/utils"

export default async function DMPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = await serverClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/sign-in")
  if (userId === user.id) redirect("/home")

  const { data: peer } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (!peer) notFound()

  const { data: myBlock } = await supabase
    .from("blocks")
    .select("*")
    .eq("user_id", user.id)
    .eq("blocked_user_id", userId)
    .maybeSingle()

  const { data: blockersData } = await supabase.rpc("get_my_blockers")
  const blockers = (blockersData as { user_id: string }[] | null) ?? []

  const blockedCondition = blockers.some((entry) => entry.user_id === userId)
    ? "blocked_me"
    : "none"
  const blockStatus = myBlock ? "blocked_by_me" : blockedCondition

  if (blockStatus !== "none") {
    return (
      <BlockedState
        blockStatus={blockStatus}
        currentUserId={user.id}
        peerId={userId}
        peerName={peer.name}
        blockedByMeDescription="You can't send messages to this user until you unblock them."
        blockedDescription="You can't send messages to this user."
      />
    )
  }

  const { data: friendship } = await supabase
    .from("friendships")
    .select("user_a")
    .eq("status", "accepted")
    .or(
      `and(user_a.eq.${user.id},user_b.eq.${userId}),and(user_a.eq.${userId},user_b.eq.${user.id})`,
    )
    .maybeSingle()

  const isFriend = !!friendship

  const [userA, userB] = conversationPair(user.id, userId)

  let conversation: {
    id: string
    user_a: string
    user_a_last_read_at?: string | null
    user_b_last_read_at?: string | null
  } | null = null

  const { data: existing } = await supabase
    .from("conversations")
    .select("id, user_a, user_a_last_read_at, user_b_last_read_at")
    .eq("user_a", userA)
    .eq("user_b", userB)
    .maybeSingle()

  conversation = existing

  if (!conversation) {
    const { data: inserted } = await supabase
      .from("conversations")
      .insert({ user_a: userA, user_b: userB })
      .select("id, user_a, user_a_last_read_at, user_b_last_read_at")
      .maybeSingle()

    if (inserted) {
      conversation = inserted
    } else {
      const { data: raced } = await supabase
        .from("conversations")
        .select("id, user_a, user_a_last_read_at, user_b_last_read_at")
        .eq("user_a", userA)
        .eq("user_b", userB)
        .maybeSingle()

      conversation = raced
    }
  }

  if (!conversation) {
    throw new Error("Failed to resolve conversation")
  }

  const { data: raw } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(30)

  const initialMessages = ((raw as DMMessage[] | null) ?? []).reverse()

  const peerLastReadAt =
    peer.id === conversation.user_a
      ? conversation.user_a_last_read_at
      : conversation.user_b_last_read_at

  return (
    <DMThread
      conversationId={conversation.id}
      peer={
        {
          id: peer.id,
          name: peer.name,
          username: peer.username,
        } as DMPeer
      }
      currentUserId={user.id}
      initialMessages={initialMessages}
      initialPeerLastReadAt={peerLastReadAt ?? null}
      isFriend={isFriend}
    />
  )
}
