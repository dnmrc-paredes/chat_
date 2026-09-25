import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { BlockedState } from "./BlockedState"

const mockRefresh = jest.fn()
const mockDelete = jest.fn()
const mockDeleteResult = jest.fn(
  (): Promise<{ error: { message: string } | null }> =>
    Promise.resolve({ error: null }),
)

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock("sonner", () => ({
  toast: jest.fn(),
}))

jest.mock("@/lib/supabase/client", () => ({
  browserClient: () => ({
    from: () => ({
      delete: () => {
        mockDelete()
        return {
          eq: () => ({
            eq: () => mockDeleteResult(),
          }),
        }
      },
    }),
  }),
}))

const toastMock = toast as jest.MockedFunction<typeof toast>

describe("BlockedState", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDeleteResult.mockResolvedValue({ error: null })
  })

  it("shows the unblock affordance when you blocked the user", () => {
    render(
      <BlockedState
        blockStatus="blocked_by_me"
        currentUserId="me-id"
        peerId="peer-id"
        peerName="Ada"
      />,
    )

    expect(
      screen.getByRole("heading", { name: "You blocked Ada" }),
    ).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Unblock User" }),
    ).toBeInTheDocument()
  })

  it("hides the unblock affordance when blocked by the other user", () => {
    render(
      <BlockedState
        blockStatus="blocked_me"
        currentUserId="me-id"
        peerId="peer-id"
        peerName="Ada"
      />,
    )

    expect(
      screen.getByRole("heading", { name: "You've been blocked" }),
    ).toBeVisible()
    expect(
      screen.queryByRole("button", { name: "Unblock User" }),
    ).not.toBeInTheDocument()
  })

  it("renders the custom descriptions passed by the page", () => {
    render(
      <BlockedState
        blockStatus="blocked_me"
        currentUserId="me-id"
        peerId="peer-id"
        peerName="Ada"
        blockedDescription="You can't send messages to this user."
      />,
    )

    expect(
      screen.getByText("You can't send messages to this user."),
    ).toBeVisible()
  })

  it("unblocks the user and refreshes the page on success", async () => {
    render(
      <BlockedState
        blockStatus="blocked_by_me"
        currentUserId="me-id"
        peerId="peer-id"
        peerName="Ada"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Unblock User" }))

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith("Unblocked Ada.")
    })
    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it("surfaces an error and skips the refresh when unblocking fails", async () => {
    mockDeleteResult.mockResolvedValue({ error: { message: "boom" } })
    jest.spyOn(console, "error").mockImplementation(() => {})

    render(
      <BlockedState
        blockStatus="blocked_by_me"
        currentUserId="me-id"
        peerId="peer-id"
        peerName="Ada"
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Unblock User" }))

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith("Couldn't unblock user.")
    })
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it("links back to the supplied back href", () => {
    render(
      <BlockedState
        blockStatus="blocked_by_me"
        currentUserId="me-id"
        peerId="peer-id"
        peerName="Ada"
        backHref="/friends"
      />,
    )

    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute(
      "href",
      "/friends",
    )
  })
})
