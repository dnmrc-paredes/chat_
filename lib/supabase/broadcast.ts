import { browserClient } from "./client"

export const LOBBY_CHANNEL = "room:lobby:messages"

export const sendLobbyBroadcast = (event: string, payload: unknown) => {
  const channel = browserClient().channel(LOBBY_CHANNEL)

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      channel.send({ type: "broadcast", event, payload })
      browserClient().removeChannel(channel)
    }
  })
}