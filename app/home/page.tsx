import { redirect } from "next/navigation"
import { ChatForm } from "@/components/Forms/Chat"
import { ConnectedUsers } from "@/components/Message/ConnectedUsers"
import { MessageList } from "@/components/Message/Messages"
import { Sidebar } from "@/components/Navigation/Sidebar"
import { LobbyProvider } from "@/components/Providers/Lobby"
import { serverClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await serverClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  return (
    <LobbyProvider user={user}>
      <div className="flex h-dvh w-full flex-col gap-4 p-4">
        <Sidebar />
        <ConnectedUsers />
        <MessageList />
        <ChatForm />
      </div>
    </LobbyProvider>
  )
}
