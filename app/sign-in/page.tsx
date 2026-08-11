import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { LucideMail, EyeClosed } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function SignIn() {
  return (
    <div className="h-dvh flex items-center justify-center w-full">
      <form className="flex flex-col w-[400px] gap-6 p-4">
        <Field className="">
          <FieldLabel htmlFor="inline-start-input">Email</FieldLabel>
          <InputGroup>
            <InputGroupInput id="email" placeholder="Email" />
            <InputGroupAddon align="inline-start">
              <LucideMail className="text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field className="">
          <FieldLabel htmlFor="inline-start-input">Password</FieldLabel>
          <InputGroup>
            <InputGroupInput id="password" />
            <InputGroupAddon align="inline-end">
              <EyeClosed className="text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field orientation="horizontal">
          <Checkbox
            id="show-password"
            name="show-password"
            className="cursor-pointer"
          />
          <Label htmlFor="show-password" className="cursor-pointer">
            Show Password
          </Label>
        </Field>

        <Button className="cursor-pointer"> Sign In </Button>

        <Link href="/sign-up" className="text-sm">
          Go to Sign Up
        </Link>
      </form>
    </div>
  )
}
