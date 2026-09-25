"use client"

import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  SendHorizonal,
  Trash2,
  User2,
  UserMinus,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { getAttachmentUrl } from "@/lib/supabase/attachments"
import { sendLobbyBroadcast } from "@/lib/supabase/broadcast"
import { browserClient } from "@/lib/supabase/client"
import { USER_BLOCKED_EVENT } from "@/hooks/useLobby"
import { useHasNavigated } from "@/components/Providers/Navigation"
import { cn, deriveHandle, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { BlockedState } from "../Blocking/BlockedState"
import { Bubble, BubbleContent } from "../ui/bubble"
import { Button, buttonVariants } from "../ui/button"
import { Dialog, DialogClose, DialogContent } from "../ui/dialog"
import { useDMComposer } from "@/hooks/useDMComposer"
import { useDMData } from "@/hooks/useDMData"
import { useDMRealtimeExtras } from "@/hooks/useDMRealtimeExtras"
import { useDMScroll } from "@/hooks/useDMScroll"

/* eslint-disable @next/next/no-img-element -- chat attachments use expiring signed URLs, so next/image caching doesn't apply */

const MAX_LENGTH = 500
const EDIT_WINDOW_MS = 5 * 60 * 1000

export type DMMessage = {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  text: string
  created_at: string
  delivered_at: string | null
  edited_at: string | null
  deleted_at: string | null
  attachment_path: string | null
  attachment_name: string | null
  attachment_type: string | null
}

type DMAttachment = {
  path: string
  name: string
  type: string
}

export type DMPeer = {
  id: string
  name: string
  username: string | null
}

type DMThreadProps = {
  conversationId: string
  peer: DMPeer
  currentUserId: string
  initialMessages: DMMessage[]
  initialPeerLastReadAt: string | null
  isFriend: boolean
}

const formatTime = (timestamp: string) =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp))

const useAttachmentUrl = (path: string) => {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    getAttachmentUrl(path)
      .then((resolved) => {
        if (active) setUrl(resolved)
      })
      .catch((error) => console.error(error))

    return () => {
      active = false
    }
  }, [path])

  return url
}

const AttachmentView = ({
  attachment,
  onOpen,
}: {
  attachment: DMAttachment
  onOpen?: (url: string, name: string) => void
}) => {
  const url = useAttachmentUrl(attachment.path)
  const isImage = attachment.type.startsWith("image/")

  if (!url) {
    return (
      <div className="flex min-h-24 min-w-48 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isImage) {
    return (
      <button
        type="button"
        aria-label={`Open ${attachment.name}`}
        onClick={() => onOpen?.(url, attachment.name)}
        className="block w-full cursor-zoom-in"
      >
        <img
          src={url}
          alt={attachment.name}
          loading="lazy"
          decoding="async"
          className="block h-auto max-h-72 w-full max-w-75 object-cover"
        />
      </button>
    )
  }

  return (
    <a
      href={url}
      download={attachment.name}
      className="flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
    >
      <FileText className="size-5 shrink-0" />
      <span className="min-w-0 truncate text-sm font-medium">
        {attachment.name}
      </span>
    </a>
  )
}

const isWithinEditWindow = (createdAt: string) =>
  Date.now() - new Date(createdAt).getTime() <= EDIT_WINDOW_MS

export const DMThread = ({
  conversationId,
  peer,
  currentUserId,
  initialMessages,
  initialPeerLastReadAt,
  isFriend,
}: DMThreadProps) => {
  const router = useRouter()
  const hasNavigated = useHasNavigated()
  const [openActions, setOpenActions] = useState(false)
  const attachInputRef = useRef<HTMLInputElement | null>(null)
  const [viewer, setViewer] = useState<{ url: string; name: string } | null>(
    null,
  )

  const {
    deleteMessage,
    editMessage,
    isLoadingOlder,
    loadOlder,
    messages,
    peerLastReadAt,
    sendMessage,
  } = useDMData({
    conversationId,
    currentUserId,
    initialMessages,
    initialPeerLastReadAt,
    peerId: peer.id,
  })

  const {
    probeBlocked,
    sendTyping,
    sendTypingStop,
    isLocallyBlocked,
    typingPeer,
  } = useDMRealtimeExtras({ conversationId, currentUserId, peerId: peer.id })

  const { containerRef, handleScroll } = useDMScroll({
    currentUserId,
    loadOlder,
    messages,
  })

  const {
    cancelEditing,
    editingId,
    handleFileChange,
    handleRemoveAttachment,
    handleSend,
    input,
    isOverLimit,
    isUploading,
    length,
    pendingAttachment,
    setInput,
    startEditing,
  } = useDMComposer({
    messages,
    conversationId,
    currentUserId,
    editMessage,
    sendMessage,
    probeBlocked,
    sendTypingStop,
  })

  useEffect(() => {
    if (!viewer) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewer(null)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [viewer])

  const handle = deriveHandle(peer.username, peer.name, peer.id)

  const unfriendPeer = async () => {
    const { error } = await browserClient()
      .from("friendships")
      .delete()
      .or(
        `and(user_a.eq.${currentUserId},user_b.eq.${peer.id}),and(user_a.eq.${peer.id},user_b.eq.${currentUserId})`,
      )

    if (error) {
      console.error(error)
      toast("Couldn't unfriend.")
      return
    }

    setOpenActions(false)
    toast(`Removed ${peer.name} from your friends.`)
    router.refresh()
  }

  const addFriend = async () => {
    const { error } = await browserClient()
      .from("friendships")
      .insert({ user_a: currentUserId, user_b: peer.id })

    if (error) {
      console.error(error)
      toast("Couldn't add friend.")
      return
    }

    setOpenActions(false)
    toast(`Added ${peer.name} as a friend.`)
    router.refresh()
  }

  const blockPeer = async () => {
    const { error: blockError } = await browserClient()
      .from("blocks")
      .insert({ user_id: currentUserId, blocked_user_id: peer.id })

    if (blockError) {
      console.error(blockError)
      toast("Couldn't block user.")
      return
    }

    await browserClient()
      .from("friendships")
      .delete()
      .or(
        `and(user_a.eq.${currentUserId},user_b.eq.${peer.id}),and(user_a.eq.${peer.id},user_b.eq.${currentUserId})`,
      )

    sendLobbyBroadcast(USER_BLOCKED_EVENT, {
      target_id: peer.id,
      sender_id: currentUserId,
    })

    setOpenActions(false)
    toast(`${peer.name} blocked.`)
    router.refresh()
  }

  useEffect(() => {
    if (!openActions) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenActions(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openActions])

  if (isLocallyBlocked) {
    return (
      <BlockedState
        blockStatus="blocked_me"
        currentUserId={currentUserId}
        peerId={peer.id}
        peerName={peer.name}
        blockedDescription="You can't send messages to this user."
      />
    )
  }

  return (
    <div className="flex h-dvh w-full flex-col">
      <header className="flex items-center gap-3 border-b-2 border-input p-3">
        {hasNavigated && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpenActions(true)}
          aria-label={`Open actions for ${peer.name}`}
          className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md p-1 text-left"
        >
          <Avatar className="size-9 shrink-0">
            <AvatarFallback>{getInitials(peer.name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{peer.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              @{handle}
            </span>
          </div>
        </button>
      </header>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-6"
      >
        {isLoadingOlder && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No messages yet — say hi!
          </div>
        )}

        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId
          const isLastMessage = message.id === messages.at(-1)?.id
          const isReadByPeer =
            isOwn &&
            !!peerLastReadAt &&
            new Date(message.created_at).getTime() <=
              new Date(peerLastReadAt).getTime()
          const isDelivered = isOwn && !!message.delivered_at
          const isDeleted = !!message.deleted_at
          const canEdit =
            isOwn && !isDeleted && isWithinEditWindow(message.created_at)
          const attachment =
            message.attachment_path &&
            message.attachment_name &&
            message.attachment_type
              ? {
                  path: message.attachment_path,
                  name: message.attachment_name,
                  type: message.attachment_type,
                }
              : null

          return (
            <div
              key={message.id}
              className={cn(
                "group/bubble flex max-w-[80%] flex-col gap-1",
                isOwn ? "items-end self-end" : "items-start self-start",
              )}
            >
              {isOwn && !isDeleted && (
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/bubble:opacity-100">
                  {canEdit && (
                    <button
                      type="button"
                      aria-label="Edit message"
                      onClick={() => startEditing(message)}
                      className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Delete message"
                    onClick={() => deleteMessage(message)}
                    className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}

              <Bubble
                align={isOwn ? "end" : "start"}
                variant={isOwn ? "default" : "secondary"}
              >
                {isDeleted ? (
                  <BubbleContent className="max-w-[initial] italic text-muted-foreground">
                    Message unsent
                  </BubbleContent>
                ) : (
                  <BubbleContent
                    className={cn(
                      "max-w-[initial]",
                      attachment && "overflow-hidden p-0",
                    )}
                  >
                    {message.edited_at && (
                      <span
                        className={cn(
                          "block text-[10px] uppercase tracking-wide opacity-70",
                          attachment && "px-3 pb-0.5 pt-2",
                        )}
                      >
                        edited
                      </span>
                    )}
                    {attachment && (
                      <AttachmentView
                        attachment={attachment}
                        onOpen={(url, name) => setViewer({ url, name })}
                      />
                    )}
                    {message.text.trim() && (
                      <span className={cn("block", attachment && "px-3 py-2")}>
                        {message.text}
                      </span>
                    )}
                  </BubbleContent>
                )}
              </Bubble>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>{formatTime(message.created_at)}</span>
                {isOwn &&
                  isLastMessage &&
                  (isReadByPeer ? (
                    <>
                      <CheckCheck size={12} className="text-primary" />
                      <span className="text-primary">Seen</span>
                    </>
                  ) : isDelivered ? (
                    <>
                      <CheckCheck size={12} />
                      <span>Delivered</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} />
                      <span>Sent</span>
                    </>
                  ))}
              </span>
            </div>
          )
        })}
      </div>

      {typingPeer && (
        <div className="flex items-center gap-1.5 border-t border-input px-4 py-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <span className="size-1 animate-bounce rounded-full bg-current" />
            <span
              className="size-1 animate-bounce rounded-full bg-current"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="size-1 animate-bounce rounded-full bg-current"
              style={{ animationDelay: "300ms" }}
            />
          </span>
          {peer.name} is typing
        </div>
      )}

      <form
        className="w-full p-4 pt-0"
        onSubmit={(event) => {
          event.preventDefault()
          handleSend()
        }}
      >
        {pendingAttachment && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-muted px-2 py-2">
            {pendingAttachment.type.startsWith("image/") ? (
              <img
                src={pendingAttachment.previewUrl}
                alt=""
                className="size-10 shrink-0 rounded object-cover"
              />
            ) : (
              <FileText className="size-5 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {pendingAttachment.name}
            </span>
            {isUploading && (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            )}
            <button
              type="button"
              aria-label="Remove attachment"
              onClick={handleRemoveAttachment}
              disabled={isUploading}
              className="shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-foreground/10 disabled:pointer-events-none disabled:opacity-50"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {editingId && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Pencil className="size-3.5" />
            <span>
              Editing message
              {!isWithinEditWindow(
                messages.find((m) => m.id === editingId)?.created_at ?? "",
              ) && " (window expired)"}
            </span>
            <button
              type="button"
              onClick={cancelEditing}
              className="ml-auto cursor-pointer rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupButton
              type="button"
              variant="ghost"
              aria-label="Attach a file"
              disabled={isUploading || !!pendingAttachment || !!editingId}
              onClick={() => attachInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </InputGroupButton>
            <input
              ref={attachInputRef}
              type="file"
              className="sr-only"
              onChange={handleFileChange}
            />
          </InputGroupAddon>
          <InputGroupInput
            value={input}
            placeholder={
              editingId ? "Edit your message..." : `Message @${handle}`
            }
            onChange={(event) => {
              setInput(event.target.value)
              if (event.target.value.trim()) sendTyping()
            }}
            onBlur={() => {
              if (input.trim()) sendTypingStop()
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              variant="secondary"
              disabled={isUploading}
            >
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

      <Dialog
        open={openActions}
        onOpenChange={(open) => {
          if (!open) setOpenActions(false)
        }}
      >
        <DialogContent aria-label={`Actions for ${peer.name}`}>
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback>{getInitials(peer.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{peer.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @{handle}
                </p>
              </div>
            </div>
            <DialogClose
              aria-label="Close"
              className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </DialogClose>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Link
              href={`/profile/${peer.id}`}
              className={buttonVariants({ variant: "outline" })}
              onClick={() => setOpenActions(false)}
            >
              <User2 />
              View Profile
            </Link>
            {isFriend ? (
              <Button variant="outline" onClick={unfriendPeer}>
                <UserMinus />
                Unfriend
              </Button>
            ) : (
              <Button variant="outline" onClick={addFriend}>
                <Plus />
                Add Friend
              </Button>
            )}
            <Button variant="destructive" onClick={blockPeer}>
              <Ban />
              Block
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {viewer && (
        <Dialog
          open={!!viewer}
          onOpenChange={(open) => {
            if (!open) setViewer(null)
          }}
        >
          <DialogContent
            aria-label={viewer.name}
            overlayClassName="bg-black/80"
            className="max-w-[calc(100vw-2rem)] border-none bg-transparent p-0 shadow-none"
          >
            <DialogClose
              aria-label="Close image"
              className="absolute right-4 top-4 flex size-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X size={18} />
            </DialogClose>
            <img
              src={viewer.url}
              alt={viewer.name}
              className="max-h-[85dvh] max-w-full cursor-zoom-out rounded-md object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

/* eslint-enable @next/next/no-img-element */
