import { redirect } from "next/navigation"
import { FriendsList } from "@/components/Friends/FriendsList"
import { serverClient } from "@/lib/supabase/server"

export default async function FriendsPage() {
  const supabase = await serverClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/sign-in")

  const { data: friendships } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

  const peerIds = [
    ...new Set(
      (friendships ?? []).map((friendship) =>
        friendship.user_a === user.id ? friendship.user_b : friendship.user_a,
      ),
    ),
  ]

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, username")
    .in("id", peerIds)

  const { data: blocked } = await supabase
    .from("blocks")
    .select("blocked_user_id")
    .eq("user_id", user.id)

  const blockedIds = new Set(
    (blocked ?? []).map((entry) => entry.blocked_user_id),
  )
  const friendsSince = new Map(
    (friendships ?? []).map((friendship) => [
      friendship.user_a === user.id ? friendship.user_b : friendship.user_a,
      friendship.created_at,
    ]),
  )

  const friends = (profiles ?? [])
    .filter((profile) => !blockedIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      name: profile.name,
      username: profile.username,
      friendsSince: friendsSince.get(profile.id) ?? null,
    }))

  return (
    <div className="flex h-dvh w-full flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Friends</h1>
      <FriendsList friends={friends} currentUserId={user.id} />
    </div>
  )
}
