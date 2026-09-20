import { browserClient } from "./client"

export const LOBBY_CHANNEL = "room:lobby:messages"

export const sendLobbyBroadcast = (event: string, payload: unknown) => {
  const supabase = browserClient()
  const channel = supabase.channel(LOBBY_CHANNEL)

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      try {
        channel.send({ type: "broadcast", event, payload })
      } catch (error) {
        console.error("Broadcast failed:", error)
      }
      supabase.removeChannel(channel)
    } else if (status === "CHANNEL_ERROR") {
      console.error("Lobby channel error")
      supabase.removeChannel(channel)
    }
  })
}
