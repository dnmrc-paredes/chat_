"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useSession } from "@/hooks/useAuth"
import { browserClient } from "@/lib/supabase/client"

export type FriendNotification = {
  id: string
  user_id: string
  sender_id: string | null
  sender_name: string
  kind: "friend_request" | "friend_accepted"
  is_read: boolean
  created_at: string
}

export const useNotifications = () => {
  const { user } = useSession()
  const [notifications, setNotifications] = useState<FriendNotification[]>([])

  const refresh = useCallback(() => {
    if (!user) return

    browserClient()
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) setNotifications(data as FriendNotification[])
      })
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!user) return

    const supabase = browserClient()
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        refresh,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, refresh])

  const unread = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  )

  const markAllRead = useCallback(async () => {
    if (!user) return

    try {
      const { error } = await browserClient()
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (error) {
        console.error(error)
        toast("Couldn't mark notifications as read.")
        return
      }
    } catch (error) {
      console.error(error)
      toast("Couldn't mark notifications as read.")
      return
    }

    refresh()
  }, [user, refresh])

  const clearAll = useCallback(async () => {
    if (!user) return

    try {
      const { error } = await browserClient()
        .from("notifications")
        .delete()
        .eq("user_id", user.id)

      if (error) {
        console.error(error)
        toast("Couldn't clear notifications.")
        return
      }
    } catch (error) {
      console.error(error)
      toast("Couldn't clear notifications.")
      return
    }

    refresh()
  }, [user, refresh])

  return { notifications, unread, markAllRead, clearAll }
}
