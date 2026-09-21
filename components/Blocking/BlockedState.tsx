"use client"

import { Ban } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { browserClient } from "@/lib/supabase/client"
import { Button, buttonVariants } from "../ui/button"

type BlockedStateProps = {
  blockStatus: "blocked_by_me" | "blocked_me"
  currentUserId: string
  peerId: string
  peerName: string
  blockedByMeDescription?: string
  blockedDescription?: string
  backHref?: string
}

export const BlockedState = ({
  blockStatus,
  currentUserId,
  peerId,
  peerName,
  blockedByMeDescription = "You can't interact with this user until you unblock them.",
  blockedDescription = "You can't interact with this user.",
  backHref = "/home",
}: BlockedStateProps) => {
  const router = useRouter()
  const [isUnblocking, setIsUnblocking] = useState(false)
  const blockedByMe = blockStatus === "blocked_by_me"

  const unblock = async () => {
    setIsUnblocking(true)

    const { error } = await browserClient()
      .from("blocks")
      .delete()
      .eq("user_id", currentUserId)
      .eq("blocked_user_id", peerId)

    setIsUnblocking(false)

    if (error) {
      console.error(error)
      toast("Couldn't unblock user.")
      return
    }

    toast(`Unblocked ${peerName}.`)
    router.refresh()
  }

  return (
    <div className="flex h-dvh w-full flex-col gap-4 p-4">
      <div className="flex w-full flex-col items-center gap-3 rounded-md border-2 border-input p-10 text-center">
        <Ban className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">
          {blockedByMe ? `You blocked ${peerName}` : "You've been blocked"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {blockedByMe ? blockedByMeDescription : blockedDescription}
        </p>
        <div className="flex w-full flex-col gap-2">
          {blockedByMe && (
            <Button
              onClick={unblock}
              disabled={isUnblocking}
              className="w-full"
            >
              {isUnblocking ? "Unblocking…" : "Unblock User"}
            </Button>
          )}
          <Link
            href={backHref}
            className={buttonVariants({
              variant: "outline",
              className: "w-full",
            })}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
