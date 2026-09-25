import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { FriendStatus } from "@/hooks/useLobby"
import { UserPopover } from "./UserPopover"

const mockAddFriend = jest.fn()
const mockAcceptFriend = jest.fn()
const mockBlockUser = jest.fn()
const mockUnblockUser = jest.fn()
const mockMentionUser = jest.fn()
const mockOnClose = jest.fn()

type ChannelMock = {
  user: { id: string; user_metadata: { username: string; name: string } }
  getFriendStatus: () => FriendStatus
  isBlockedByMe: () => boolean
  addFriend: (id: string) => void
  acceptFriend: (id: string) => void
  blockUser: (id: string) => void
  unblockUser: (id: string) => void
  mentionUser: (handle: string) => void
}

const baseChannel = (): ChannelMock => ({
  user: { id: "me", user_metadata: { username: "me", name: "Me" } },
  getFriendStatus: () => "none",
  isBlockedByMe: () => false,
  addFriend: mockAddFriend,
  acceptFriend: mockAcceptFriend,
  blockUser: mockBlockUser,
  unblockUser: mockUnblockUser,
  mentionUser: mockMentionUser,
})

const mockChannel = jest.fn((): ChannelMock => baseChannel())

jest.mock("../Providers/Lobby", () => ({
  useLobbyChannel: () => mockChannel(),
}))

const renderPopover = (overrides: Partial<ChannelMock> = {}) => {
  mockChannel.mockReturnValue({ ...baseChannel(), ...overrides })

  const anchorEl = document.createElement("button")
  document.body.appendChild(anchorEl)

  return render(
    <UserPopover
      userId="peer"
      name="Ada Lovelace"
      username="ada"
      anchorEl={anchorEl}
      align="start"
      onClose={mockOnClose}
    />,
  )
}

describe("UserPopover", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the peer's name and derived handle", () => {
    renderPopover()

    expect(screen.getByText("Ada Lovelace")).toBeVisible()
    expect(screen.getByText("@ada")).toBeVisible()
  })

  it("marks the viewer as self and hides relation actions", () => {
    renderPopover({
      user: { id: "peer", user_metadata: { username: "ada", name: "Ada" } },
    })

    expect(screen.getByText("This is you")).toBeVisible()
    expect(
      screen.queryByRole("button", { name: "Block" }),
    ).not.toBeInTheDocument()
  })

  it("shows Add Friend when there is no relationship", async () => {
    renderPopover()

    await userEvent.click(screen.getByRole("button", { name: "Add Friend" }))

    expect(mockAddFriend).toHaveBeenCalledWith("peer")
  })

  it("shows a disabled Request Sent for an outgoing request", () => {
    renderPopover({ getFriendStatus: () => "outgoing" })

    expect(screen.getByRole("button", { name: "Request Sent" })).toBeDisabled()
  })

  it("shows Accept Request for an incoming request", async () => {
    renderPopover({ getFriendStatus: () => "incoming" })

    await userEvent.click(
      screen.getByRole("button", { name: "Accept Request" }),
    )

    expect(mockAcceptFriend).toHaveBeenCalledWith("peer")
  })

  it("shows Message and Friends once accepted", () => {
    renderPopover({ getFriendStatus: () => "accepted" })

    expect(screen.getByRole("link", { name: "Message" })).toHaveAttribute(
      "href",
      "/dms/peer",
    )
    expect(screen.getByRole("button", { name: "Friends" })).toBeDisabled()
    expect(
      screen.queryByRole("button", { name: "Add Friend" }),
    ).not.toBeInTheDocument()
  })

  it("blocks the user when not blocked", async () => {
    renderPopover()

    await userEvent.click(screen.getByRole("button", { name: "Block" }))

    expect(mockBlockUser).toHaveBeenCalledWith("peer")
  })

  it("unblocks the user when already blocked", async () => {
    renderPopover({ isBlockedByMe: () => true })

    await userEvent.click(screen.getByRole("button", { name: "Unblock" }))

    expect(mockUnblockUser).toHaveBeenCalledWith("peer")
  })

  it("mentions the user by handle and closes", async () => {
    renderPopover()

    await userEvent.click(screen.getByRole("button", { name: "Mention" }))

    expect(mockMentionUser).toHaveBeenCalledWith("ada")
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("closes on Escape", async () => {
    renderPopover()

    await userEvent.keyboard("{Escape}")

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("closes when clicking outside the panel", async () => {
    renderPopover()

    await userEvent.click(document.body)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
