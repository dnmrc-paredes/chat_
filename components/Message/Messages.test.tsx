import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ChatMessage } from "@/hooks/useLobby"
import { MessageList } from "./Messages"

jest.mock("../Providers/Lobby", () => ({
  useLobbyChannel: () => mockChannel(),
}))

jest.mock("../UserPopup/UserPopover", () => ({
  UserPopover: ({ name }: { name: string }) => <div>popover:{name}</div>,
}))

const currentUser = {
  id: "me",
  user_metadata: { username: "me", name: "Me" },
}

const buildMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "m1",
  sender_id: "peer",
  sender_name: "Ada",
  username: "ada",
  text: "hello",
  created_at: "2025-01-15T10:30:00.000Z",
  ...overrides,
})

type ChannelMock = {
  messages: ChatMessage[]
  user: typeof currentUser
  isBlockedByMe: (id: string) => boolean
  blockers: string[]
  focusMessageId: string | null
  focusNonce: number
}

const baseChannel = (): ChannelMock => ({
  messages: [],
  user: currentUser,
  isBlockedByMe: () => false,
  blockers: [],
  focusMessageId: null,
  focusNonce: 0,
})

const mockChannel = jest.fn((): ChannelMock => baseChannel())

describe("MessageList", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockChannel.mockReturnValue(baseChannel())
  })

  it("renders message text with sender and initials", () => {
    mockChannel.mockReturnValue({
      ...baseChannel(),
      messages: [buildMessage()],
    })

    render(<MessageList />)

    expect(screen.getByText("hello")).toBeVisible()
    expect(screen.getByText("Ada")).toBeVisible()
    expect(screen.getByText("A")).toBeVisible()
  })

  it("aligns the viewer's own message to the end", () => {
    mockChannel.mockReturnValue({
      ...baseChannel(),
      messages: [buildMessage({ id: "own", sender_id: "me", text: "mine" })],
    })

    const { container } = render(<MessageList />)

    expect(container.querySelector("#message-own")).toHaveClass("self-end")
  })

  it("aligns someone else's message to the start", () => {
    mockChannel.mockReturnValue({
      ...baseChannel(),
      messages: [buildMessage()],
    })

    const { container } = render(<MessageList />)

    expect(container.querySelector("#message-m1")).toHaveClass("self-start")
  })

  it("hides messages from users the viewer blocked", () => {
    mockChannel.mockReturnValue({
      ...baseChannel(),
      messages: [buildMessage({ text: "should not show" })],
      isBlockedByMe: (id: string) => id === "peer",
    })

    render(<MessageList />)

    expect(screen.queryByText("should not show")).not.toBeInTheDocument()
  })

  it("hides messages from users who blocked the viewer", () => {
    mockChannel.mockReturnValue({
      ...baseChannel(),
      messages: [buildMessage({ text: "hidden" })],
      blockers: ["peer"],
    })

    render(<MessageList />)

    expect(screen.queryByText("hidden")).not.toBeInTheDocument()
  })

  it("highlights a message that mentions the viewer", () => {
    mockChannel.mockReturnValue({
      ...baseChannel(),
      messages: [buildMessage({ text: "hey @me how are you" })],
    })

    const { container } = render(<MessageList />)

    expect(container.querySelector("#message-m1")?.innerHTML).toContain(
      "bg-linear-to-r",
    )
  })

  it("does not highlight the viewer's own message even when it self-mentions", () => {
    mockChannel.mockReturnValue({
      ...baseChannel(),
      messages: [buildMessage({ id: "own", sender_id: "me", text: "@me" })],
    })

    const { container } = render(<MessageList />)

    expect(container.querySelector("#message-own")?.innerHTML).not.toContain(
      "bg-linear-to-r",
    )
  })

  it("opens and closes the user popover from the sender avatar", async () => {
    mockChannel.mockReturnValue({
      ...baseChannel(),
      messages: [buildMessage()],
    })

    render(<MessageList />)

    await userEvent.click(screen.getByRole("button", { name: "View Ada" }))
    expect(screen.getByText("popover:Ada")).toBeVisible()

    await userEvent.click(screen.getByRole("button", { name: "View Ada" }))
    expect(screen.queryByText("popover:Ada")).not.toBeInTheDocument()
  })

  it("scrolls the focused message into view and highlights it", () => {
    const scrollIntoView = jest.fn()
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      value: scrollIntoView,
      writable: true,
      configurable: true,
    })

    mockChannel.mockReturnValue({
      ...baseChannel(),
      messages: [buildMessage()],
      focusMessageId: "m1",
    })

    const { container } = render(<MessageList />)

    expect(scrollIntoView).toHaveBeenCalled()
    expect(container.querySelector("#message-m1")).toHaveClass(
      "highlight-message",
    )
  })
})
