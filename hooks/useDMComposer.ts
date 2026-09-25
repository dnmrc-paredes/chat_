"use client"

import { useCallback, useState, type ChangeEvent } from "react"
import { toast } from "sonner"
import {
  deleteAttachment,
  MAX_ATTACHMENT_SIZE,
  uploadAttachment,
} from "@/lib/supabase/attachments"
import type { DMMessage } from "@/components/DM/DMThread"

const MAX_LENGTH = 500
const EDIT_WINDOW_MS = 5 * 60 * 1000

type UseDMComposerProps = {
  conversationId: string
  currentUserId: string
  messages: DMMessage[]
  sendMessage: (
    text: string,
    attachment?: { path: string; name: string; type: string } | null,
  ) => Promise<DMMessage | null>
  editMessage: (messageId: string, text: string) => Promise<void>
  sendTypingStop: () => Promise<void>
  probeBlocked: () => Promise<boolean>
}

type PendingAttachment = {
  name: string
  type: string
  path: string
  previewUrl: string
} | null

type UseDMComposerReturn = {
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  pendingAttachment: PendingAttachment
  isUploading: boolean
  editingId: string | null
  length: number
  isOverLimit: boolean
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  handleRemoveAttachment: () => void
  startEditing: (message: DMMessage) => void
  cancelEditing: () => void
  handleSend: () => Promise<void>
}

const isWithinEditWindow = (createdAt: string) =>
  Date.now() - new Date(createdAt).getTime() <= EDIT_WINDOW_MS

export function useDMComposer({
  conversationId,
  currentUserId,
  messages,
  sendMessage,
  editMessage,
  sendTypingStop,
  probeBlocked,
}: UseDMComposerProps): UseDMComposerReturn {
  const [input, setInput] = useState("")
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget
      const file = input.files?.[0]
      input.value = ""
      if (!file || isUploading) return

      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast("File exceeds the 10 MB limit.")
        return
      }

      const previewUrl = URL.createObjectURL(file)
      setPendingAttachment({
        name: file.name,
        type: file.type || "application/octet-stream",
        path: "",
        previewUrl,
      })
      setIsUploading(true)

      try {
        const uploaded = await uploadAttachment({
          file,
          conversationId,
          senderId: currentUserId,
        })
        setPendingAttachment((prev) =>
          prev
            ? {
                ...prev,
                name: uploaded.name,
                type: uploaded.type,
                path: uploaded.path,
              }
            : prev,
        )
      } catch (error) {
        console.error(error)
        toast("Upload failed. Try again.")
        setPendingAttachment((prev) => {
          if (prev) URL.revokeObjectURL(prev.previewUrl)
          return null
        })
      } finally {
        setIsUploading(false)
      }
    },
    [conversationId, currentUserId, isUploading],
  )

  const handleRemoveAttachment = useCallback(() => {
    const attachment = pendingAttachment
    if (!attachment) return

    URL.revokeObjectURL(attachment.previewUrl)
    setPendingAttachment(null)
    if (attachment.path) {
      deleteAttachment(attachment.path).catch((error) => console.error(error))
    }
  }, [pendingAttachment])

  const startEditing = useCallback((message: DMMessage) => {
    if (!message.deleted_at && isWithinEditWindow(message.created_at)) {
      setEditingId(message.id)
      setInput(message.text)
    }
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setInput("")
  }, [])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    const attachment = pendingAttachment
    if (!text && !attachment) return
    if (text.length > MAX_LENGTH) {
      toast("Message is too long.")
      return
    }
    if (attachment && !attachment.path) return
    if (isUploading) return

    await sendTypingStop()

    if (editingId) {
      const target = messages.find((message) => message.id === editingId)
      if (
        !target ||
        target?.sender_id !== currentUserId ||
        !isWithinEditWindow(target.created_at)
      ) {
        toast("Message can no longer be edited.")
        setEditingId(null)
        setInput("")
        return
      }
      if (!text) return

      await editMessage(editingId, text)
      setEditingId(null)
      setInput("")
      return
    }

    setInput("")

    let sent: DMMessage | null = null

    try {
      sent = await sendMessage(text, attachment)
    } catch (error) {
      console.error(error)
      toast("Failed to send message.")
      return
    }

    if (!sent) {
      if (await probeBlocked()) {
        return
      }
      toast("Failed to send message.")
      return
    }

    if (attachment) {
      URL.revokeObjectURL(attachment.previewUrl)
      setPendingAttachment(null)
    }
  }, [
    input,
    pendingAttachment,
    isUploading,
    editingId,
    messages,
    currentUserId,
    sendMessage,
    editMessage,
    sendTypingStop,
    probeBlocked,
  ])

  const length = input.trim().length
  const isOverLimit = length > MAX_LENGTH

  return {
    input,
    setInput,
    pendingAttachment,
    isUploading,
    editingId,
    length,
    isOverLimit,
    handleFileChange,
    handleRemoveAttachment,
    startEditing,
    cancelEditing,
    handleSend,
  }
}
