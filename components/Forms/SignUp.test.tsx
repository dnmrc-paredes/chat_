import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { SignUpForm } from "./SignUp"

const mockPush = jest.fn()
const mockSignUp = jest.fn()
const mockRpc = jest.fn()
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
    auth: { signUp: (payload: unknown) => mockSignUp(payload) },
    rpc: (fn: string, args: unknown) => mockRpc(fn, args),
  }),
}))

const toastMock = toast as jest.MockedFunction<typeof toast>

const submit = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Sign Up" }))
}

const fillValidForm = async (
  overrides: Partial<Record<string, string>> = {},
) => {
  const values = {
    email: "ada@example.com",
    name: "Ada Lovelace",
    password: "secret123",
    confirmPassword: "secret123",
    ...overrides,
  }

  const type = async (label: string, value: string) => {
    if (!value) return
    await userEvent.type(screen.getByLabelText(label), value)
  }

  await type("Email", values.email)
  await type("Name", values.name)
  await type("Password", values.password)
  await type("Confirm Password", values.confirmPassword)
}

describe("SignUpForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: true, error: null })
    mockSignUp.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    })
  })

  it("links to sign in", () => {
    render(<SignUpForm />)

    expect(screen.getByRole("link", { name: "Go to Sign In" })).toHaveAttribute(
      "href",
      "/sign-in",
    )
  })

  it("rejects an invalid email before calling Supabase", async () => {
    render(<SignUpForm />)

    await fillValidForm({ email: "nope" })
    await submit()

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeVisible()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it("rejects an empty name", async () => {
    render(<SignUpForm />)

    await fillValidForm({ name: "" })
    await submit()

    await waitFor(() => {
      expect(screen.getByText("Invalid name")).toBeVisible()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it("rejects a password shorter than eight characters", async () => {
    render(<SignUpForm />)

    await fillValidForm({ password: "short", confirmPassword: "short" })
    await submit()

    await waitFor(() => {
      expect(
        screen.getByText("Password must have atleast 8 characters"),
      ).toBeVisible()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it("rejects mismatched password confirmation", async () => {
    render(<SignUpForm />)

    await fillValidForm({ confirmPassword: "different" })
    await submit()

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeVisible()
    })
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it("signs up with a slugified username derived from the name", async () => {
    render(<SignUpForm />)

    await fillValidForm()
    await submit()

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "secret123",
        options: {
          data: { name: "Ada Lovelace", username: "adalovelace" },
        },
      })
    })
  })

  it("retries with a random suffix when the username is taken", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5)
    mockRpc
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: true, error: null })

    render(<SignUpForm />)

    await fillValidForm()
    await submit()

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled()
    })

    const options = mockSignUp.mock.calls[0][0].options
    expect(options.data.username).not.toBe("adalovelace")
    expect(options.data.username).toMatch(/^adalovelace[a-z0-9]+$/)
    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  it("falls back to a timestamp username after exhausting retries", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5)
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000)
    mockRpc.mockResolvedValue({ data: false, error: null })

    render(<SignUpForm />)

    await fillValidForm()
    await submit()

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled()
    })

    expect(mockRpc).toHaveBeenCalledTimes(5)
    const { username } = mockSignUp.mock.calls[0][0].options.data
    expect(username).toMatch(/^adalovelace[a-z0-9]{4}$/)
    expect(username).not.toContain("undefined")
  })

  it("omits the username when the availability check errors", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "rpc down" } })

    render(<SignUpForm />)

    await fillValidForm()
    await submit()

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled()
    })

    expect(mockSignUp.mock.calls[0][0].options.data).toEqual({
      name: "Ada Lovelace",
    })
  })

  it("redirects to home when sign up returns a session", async () => {
    render(<SignUpForm />)

    await fillValidForm()
    await submit()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/home")
    })
    expect(toastMock).not.toHaveBeenCalledWith(
      "Verification code sent to your email.",
    )
  })

  it("prompts for email verification when no session is returned", async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null })

    render(<SignUpForm />)

    await fillValidForm()
    await submit()

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        "Verification code sent to your email.",
      )
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("surfaces auth errors without redirecting", async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { code: "email_exists", message: "taken" },
    })

    render(<SignUpForm />)

    await fillValidForm()
    await submit()

    await waitFor(() => {
      expect(mockShowErrors).toHaveBeenCalled()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })
})
