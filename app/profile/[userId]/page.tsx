import { notFound, redirect } from "next/navigation"
import { BlockedState } from "@/components/Blocking/BlockedState"
import { ProfileView, type Profile } from "@/components/Profile/ProfileView"
import type { Friendship } from "@/hooks/useLobby"
import { serverClient } from "@/lib/supabase/server"

export default async function ProfilePage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (!profile) notFound()

  const { data: friendship } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(user_a.eq.${user.id},user_b.eq.${userId}),and(user_a.eq.${userId},user_b.eq.${user.id})`,
    )
    .maybeSingle()

  const { data: block } = await supabase
    .from("blocks")
    .select("*")
    .eq("user_id", user.id)
    .eq("blocked_user_id", userId)
    .maybeSingle()

  const { data: blockersData } = await supabase.rpc("get_my_blockers")
  const blockers = (blockersData as { user_id: string }[] | null) ?? []
  const blockedByPeer = blockers.some((entry) => entry.user_id === userId)

  const blockStatus = block
    ? "blocked_by_me"
    : blockedByPeer
      ? "blocked_me"
      : "none"

  if (blockStatus !== "none") {
    return (
      <BlockedState
        blockStatus={blockStatus}
        currentUserId={user.id}
        peerId={userId}
        peerName={profile.name}
        blockedByMeDescription="You can't view this user's profile until you unblock them."
        blockedDescription="You can't view this user's profile."
      />
    )
  }

  return (
    <div className="flex h-dvh w-full flex-col gap-4 p-4">
      <ProfileView
        key={profile.id}
        profile={profile as Profile}
        currentUserId={user.id}
        initialFriendship={(friendship as Friendship | null) ?? null}
        initialBlocked={false}
      />
    </div>
  )
}
