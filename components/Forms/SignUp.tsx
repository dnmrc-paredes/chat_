"use client"

import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { LucideMail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { SignUpSchema } from "@/lib/validations"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { browserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { showErrors } from "@/lib/authErrors"

type FormValues = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export const SignUpForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(SignUpSchema),
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleShowPassword = () => setShowPassword((prev) => !prev)

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const { email, name, password } = values

    try {
      const { error } = await browserClient().auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })

      showErrors(error?.code)

      toast("Verification code sent to your email.")
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="h-dvh flex items-center justify-center w-full">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col w-100 gap-6 p-4"
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="email"
                placeholder="johndoe@example.com"
                {...register("email")}
                aria-invalid={!!errors.email?.message}
              />
              <InputGroupAddon align="inline-start">
                <LucideMail className="text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>
            {errors.email?.message && (
              <FieldError>{errors.email.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="name"
                placeholder="John Doe"
                {...register("name")}
                aria-invalid={!!errors.name?.message}
              />
            </InputGroup>
            {errors.name?.message && (
              <FieldError>{errors.name.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                type={showPassword ? "text" : "password"}
                id="password"
                {...register("password")}
                aria-invalid={!!errors.password?.message}
              />
            </InputGroup>
            {errors.password?.message && (
              <FieldError>{errors.password.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                type={showPassword ? "text" : "password"}
                id="confirm-password"
                {...register("confirmPassword")}
              />
            </InputGroup>
            {errors.confirmPassword?.message && (
              <FieldError>{errors.confirmPassword.message}</FieldError>
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
        </FieldGroup>

        <Button type="submit" className="cursor-pointer">
          Sign Up
        </Button>

        <Link href="/sign-in" className="text-sm">
          Go to Sign In
        </Link>
      </form>
    </div>
  )
}
