import { redirect } from "next/navigation"
import { ProfileSettings } from "@/components/Profile/SettingsForm"
import { serverClient } from "@/lib/supabase/server"

export default async function ProfilePage() {
  const supabase = await serverClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/sign-in")

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, username")
    .eq("id", user.id)
    .single()

  return (
    <ProfileSettings
      userId={user.id}
      email={user.email ?? ""}
      name={
        profile?.name ?? (user.user_metadata?.name as string | undefined) ?? ""
      }
      username={profile?.username ?? ""}
    />
  )
}
