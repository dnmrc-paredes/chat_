import { type AuthError } from "@supabase/supabase-js"
import { toast } from "sonner"

export const showErrors = (error: AuthError) => {
  switch (error.code) {
    case "email_exists":
      return toast("Email already exists.")
    case "email_not_confirmed":
      return toast("Check your email to verify your account.")
    case "invalid_credentials":
      return toast("Invalid credentials.")
    case "user_already_exists":
      return toast("An account with this email already exists.")
    case "over_email_send_rate_limit":
      return toast("Too many requests. Please try again in a moment.")
    case "validation_failed":
      return toast(error.message)
    default:
      return toast(error.message || "Something went wrong. Please try again.")
  }
}
