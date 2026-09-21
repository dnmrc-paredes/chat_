"use client"

import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { LucideMail } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { SignInSchema } from "@/lib/validations"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type SubmitHandler } from "react-hook-form"
import { useState } from "react"
import { browserClient } from "@/lib/supabase/client"
import { showErrors } from "@/lib/authErrors"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type FormValues = {
  email: string
  password: string
}

export const SignInForm = () => {
  const router = useRouter()
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(SignInSchema),
  })
  const [showPassword, setShowPassword] = useState(false)
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)

  const handleShowPassword = () => setShowPassword((prev) => !prev)

  const resendVerification = async () => {
    if (!unconfirmedEmail) return

    const { error } = await browserClient().auth.resend({
      type: "signup",
      email: unconfirmedEmail,
    })

    if (error) {
      showErrors(error)
      return
    }

    toast("Verification email sent. Check your inbox.")
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      const { email, password } = values

      const { error } = await browserClient().auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.code === "email_not_confirmed") {
          setUnconfirmedEmail(email)
        }
        showErrors(error)
        return
      }

      router.push("/home")
    } catch (error) {
      console.error(error)
      toast("Something went wrong. Please try again.")
    }
  }

  return (
    <form
      className="flex flex-col w-100 gap-6 p-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="email"
            placeholder="john@example.com"
            {...register("email")}
          />
          <InputGroupAddon align="inline-start">
            <LucideMail className="text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>
        {errors.email?.message && (
          <FieldError> {errors.email.message} </FieldError>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
          />
        </InputGroup>
        {errors.password?.message && (
          <FieldError> {errors.password.message} </FieldError>
        )}
      </Field>

      <Field orientation="horizontal">
        <Checkbox
          id="show-password"
          name="show-password"
          className="cursor-pointer"
          checked={showPassword}
          onCheckedChange={handleShowPassword}
        />
        <Label htmlFor="show-password" className="cursor-pointer">
          Show Password
        </Label>
      </Field>

      <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
        Sign In
      </Button>

      {unconfirmedEmail && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resendVerification}
          className="cursor-pointer"
        >
          Resend verification email
        </Button>
      )}

      <Link href="/sign-up" className="text-sm">
        Go to Sign Up
      </Link>
    </form>
  )
}
