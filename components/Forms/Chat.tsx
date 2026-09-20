"use client"

import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "../ui/input-group"
import { SendHorizonal } from "lucide-react"
import { type SubmitEvent, useEffect } from "react"
import { toast } from "sonner"
import { useLobbyChannel } from "@/components/Providers/Lobby"
import { cn } from "@/lib/utils"

const MAX_LENGTH = 500

export const ChatForm = () => {
  const { inputText, setInputText, sendMessage, isConnected } =
    useLobbyChannel()

  useEffect(() => {
    const to = new URLSearchParams(window.location.search).get("to")
    if (!to) return

    setInputText((prev) => `${prev ? prev.trimEnd() + " " : ""}@${to} `)
    document.getElementById("chat-input")?.focus()
  }, [setInputText])

  const length = inputText.trim().length
  const isOverLimit = length > MAX_LENGTH

  const handleSendMessage = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) return
    if (trimmed.length > MAX_LENGTH) {
      toast("Message is too long.")
      return
    }

    sendMessage(trimmed)
    setInputText("")
  }

  return (
    <form className="w-full" onSubmit={handleSendMessage}>
      <InputGroup>
        <InputGroupInput
          id="chat-input"
          placeholder="Send what's on your mind."
          value={inputText}
          disabled={!isConnected}
          onChange={(event) => setInputText(event.target.value)}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit" variant="secondary">
            <SendHorizonal />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <div className="flex justify-end pt-1.5">
        <span
          className={cn(
            "text-xs text-muted-foreground",
            isOverLimit && "text-destructive",
          )}
        >
          {length}/{MAX_LENGTH}
        </span>
      </div>
    </form>
  )
}