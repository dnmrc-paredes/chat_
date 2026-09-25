import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { SignInForm } from "./SignIn"

const mockPush = jest.fn()
const mockSignInWithPassword = jest.fn()
const mockResend = jest.fn()
const mockShowErrors = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock("sonner", () => ({ toast: jest.fn() }))

jest.mock("@/lib/authErrors", () => ({
  showErrors: (error: unknown) => mockShowErrors(error),
}))

jest.mock("@/lib/supabase/client", () => ({
  browserClient: () => ({
    auth: {
      signInWithPassword: (payload: unknown) => mockSignInWithPassword(payload),
      resend: (payload: unknown) => mockResend(payload),
    },
  }),
}))

const toastMock = toast as jest.MockedFunction<typeof toast>

const fillCredentials = async (
  email: string,
  password: string,
  type: (name: string, value: string) => Promise<void>,
) => {
  await type("Email", email)
  await type("Password", password)
}

const authError = (code: string) => ({ code, message: "auth failed" })

describe("SignInForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSignInWithPassword.mockResolvedValue({ error: null })
    mockResend.mockResolvedValue({ error: null })
  })

  it("rejects an invalid email before calling Supabase", async () => {
    render(<SignInForm />)

    await fillCredentials("not-an-email", "secret123", async (name, value) => {
      const field = screen.getByLabelText(name)
      await userEvent.type(field, value)
    })
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }))

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeVisible()
    })
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it("rejects an empty password", async () => {
    render(<SignInForm />)

    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com")
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }))

    await waitFor(() => {
      expect(screen.getByText("Invalid password")).toBeVisible()
    })
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it("redirects to home on a successful sign in", async () => {
    render(<SignInForm />)

    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com")
    await userEvent.type(screen.getByLabelText("Password"), "secret123")
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/home")
    })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "secret123",
    })
  })

  it("surfaces auth errors and does not redirect", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: authError("invalid_credentials"),
    })

    render(<SignInForm />)

    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com")
    await userEvent.type(screen.getByLabelText("Password"), "wrong")
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }))

    await waitFor(() => {
      expect(mockShowErrors).toHaveBeenCalled()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("offers resend verification when the email is not confirmed", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: authError("email_not_confirmed"),
    })

    render(<SignInForm />)

    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com")
    await userEvent.type(screen.getByLabelText("Password"), "secret123")
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }))

    const resendButton = await screen.findByRole("button", {
      name: "Resend verification email",
    })

    await userEvent.click(resendButton)

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({
        type: "signup",
        email: "ada@example.com",
      })
    })
    expect(toastMock).toHaveBeenCalledWith(
      "Verification email sent. Check your inbox.",
    )
  })
})
