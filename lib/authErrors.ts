import { type AuthError } from "@supabase/supabase-js"
import { toast } from "sonner"

export const showErrors = (code: AuthError["code"]) => {
  switch (code) {
    case "email_exists":
      return toast("Email already exist.")
    case "email_not_confirmed":
      return toast("Check your email to verify")
    case "invalid_credentials":
      return toast("Invalid credentials.")
  }
}
