import { notFound, redirect } from "next/navigation"
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

  const [userA, userB] = conversationPair(user.id, userId)

  let conversation: { id: string } | null = null

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_a", userA)
    .eq("user_b", userB)
    .maybeSingle()

  conversation = existing

  if (!conversation) {
    const { data: inserted, error } = await supabase
      .from("conversations")
      .insert({ user_a: userA, user_b: userB })
      .select("id")
      .maybeSingle()

    if (inserted) {
      conversation = inserted
    } else if (error?.code === "23505") {
      const { data: raced } = await supabase
        .from("conversations")
        .select("id")
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
      currentUserName={
        (user.user_metadata?.name as string | undefined) ??
        user.email ??
        "Guest"
      }
      initialMessages={initialMessages}
    />
  )
}
