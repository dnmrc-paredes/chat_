import { Field, FieldLabel } from "@/components/ui/field"
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

export default function SignUp() {
  return (
    <div className="h-dvh flex items-center justify-center w-full">
      <form className="flex flex-col w-100 gap-6 p-4">
        <Field className="">
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <InputGroup>
            <InputGroupInput id="email" placeholder="johndoe@example.com" />
            <InputGroupAddon align="inline-start">
              <LucideMail className="text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field className="">
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <InputGroup>
            <InputGroupInput type="password" id="password" />
          </InputGroup>
        </Field>

        <Field className="">
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <InputGroup>
            <InputGroupInput type="password" id="confirm-password" />
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

        <Button className="cursor-pointer"> Sign Up </Button>

        <Link href="/sign-in" className="text-sm">
          Go to Sign In
        </Link>
      </form>
    </div>
  )
}
