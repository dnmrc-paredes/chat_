"use client"

import {
  LucideAtSign,
  LucideLock,
  LucidePencil,
  LucideUser,
} from "lucide-react"
import { useState } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { toast } from "sonner"
import { zodResolver } from "@hookform/resolvers/zod"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { browserClient } from "@/lib/supabase/client"
import { deriveHandle, getInitials } from "@/lib/utils"
import { ProfileSettingsSchema } from "@/lib/validations"

type ProfileSettingsProps = {
  userId: string
  email: string
  name: string
  username: string
}

type FormValues = {
  name: string
  username: string
  password: string
}

export const ProfileSettings = ({
  userId,
  email,
  name,
  username,
}: ProfileSettingsProps) => {
  const [info, setInfo] = useState({ name, username, email })
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(ProfileSettingsSchema),
    defaultValues: { name, username, password: "" },
  })

  const handleEdit = () => {
    reset({
      name: info.name,
      username: info.username,
      password: "",
    })
    setIsEditing(true)
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true)
    const auth = browserClient().auth

    const { error: confirmationError } = await auth.signInWithPassword({
      email: info.email,
      password: values.password,
    })

    if (confirmationError) {
      toast("Current password is incorrect.")
      setIsSubmitting(false)
      return
    }

    const usernameValue = values.username.trim()

    if (usernameValue && usernameValue !== info.username) {
      const { data: existing } = await browserClient()
        .from("profiles")
        .select("id")
        .eq("username", usernameValue)
        .maybeSingle()

      if (existing) {
        toast("User ID already taken.")
        setIsSubmitting(false)
        return
      }
    }

    const attributes: {
      data?: { name: string; username: string | null }
    } = {}

    if (values.name !== info.name || usernameValue !== info.username) {
      attributes.data = {
        name: values.name,
        username: usernameValue ? usernameValue : null,
      }
    }

    if (!attributes.data) {
      toast("No changes to save.")
      setIsSubmitting(false)
      return
    }

    const { error: updateError } = await auth.updateUser(attributes)

    if (updateError) {
      toast("Failed to update profile.")
      setIsSubmitting(false)
      return
    }

    const {
      data: { user: updated },
    } = await auth.getUser()

    setInfo({
      name: updated?.user_metadata?.name ?? values.name,
      username: (updated?.user_metadata?.username as string | undefined) ?? "",
      email: updated?.email ?? info.email,
    })
    setIsEditing(false)
    setIsSubmitting(false)

    toast("Profile updated.")
  }

  const handle = deriveHandle(info.username || null, info.name, userId)

  return (
    <div className="flex h-dvh w-full flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Profile</h1>

      <div className="flex w-full flex-col gap-5 rounded-md border-2 border-input p-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="text-xl">
              {getInitials(info.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-lg font-semibold">{info.name}</span>
            <p className="truncate text-sm text-muted-foreground">@{handle}</p>
          </div>
        </div>

        <dl className="flex w-full flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-2 rounded-md bg-muted p-3">
            <dt className="shrink-0 text-muted-foreground">Email</dt>
            <dd className="truncate">{info.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-md bg-muted p-3">
            <dt className="shrink-0 text-muted-foreground">User ID</dt>
            <dd className="truncate">@{handle}</dd>
          </div>
        </dl>

        {isEditing ? (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex w-full flex-col gap-5"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="name"
                    placeholder="Jane Doe"
                    {...register("name")}
                    aria-invalid={!!errors.name?.message}
                  />
                  <InputGroupAddon align="inline-end">
                    <LucideUser className="text-muted-foreground" />
                  </InputGroupAddon>
                </InputGroup>
                {errors.name?.message && (
                  <FieldError>{errors.name.message}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="username">User ID</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="username"
                    placeholder="@janedoe"
                    {...register("username")}
                    aria-invalid={!!errors.username?.message}
                  />
                  <InputGroupAddon align="inline-end">
                    <LucideAtSign className="text-muted-foreground" />
                  </InputGroupAddon>
                </InputGroup>
                {errors.username?.message && (
                  <FieldError>{errors.username.message}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Current Password</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="password"
                    type="password"
                    placeholder="Required to confirm changes"
                    {...register("password")}
                    aria-invalid={!!errors.password?.message}
                  />
                  <InputGroupAddon align="inline-end">
                    <LucideLock className="text-muted-foreground" />
                  </InputGroupAddon>
                </InputGroup>
                {errors.password?.message && (
                  <FieldError>{errors.password.message}</FieldError>
                )}
              </Field>
            </FieldGroup>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={handleEdit} className="w-full">
            <LucidePencil />
            Update
          </Button>
        )}
      </div>
    </div>
  )
}
