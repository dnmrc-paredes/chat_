import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { FriendStatus } from "@/hooks/useLobby"
import { ProfileView, type Profile } from "./ProfileView"

const mockAddFriend = jest.fn()
const mockAcceptFriend = jest.fn()
const mockRemoveFriend = jest.fn()
const mockBlock = jest.fn()
const mockUnblock = jest.fn()

const mockStatus = jest.fn(() => ({ status: "none" as FriendStatus }))

jest.mock("@/hooks/useRelations", () => ({
  useRelations: () => ({
    status: mockStatus().status,
    isBlocked: false,
    friendsSince: null,
    addFriend: mockAddFriend,
    acceptFriend: mockAcceptFriend,
    removeFriend: mockRemoveFriend,
    block: mockBlock,
    unblock: mockUnblock,
  }),
}))

const profile: Profile = {
  id: "peer-id",
  name: "Ada Lovelace",
  username: "ada",
  created_at: "2025-01-15T00:00:00.000Z",
}

const renderProfile = (currentUserId = "me-id") =>
  render(
    <ProfileView
      profile={profile}
      currentUserId={currentUserId}
      initialFriendship={null}
      initialBlocked={false}
    />,
  )

describe("ProfileView friend status", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStatus.mockReturnValue({ status: "none" })
  })

  it("renders identity details and a derived handle", () => {
    renderProfile()

    expect(screen.getByRole("heading", { name: "Ada Lovelace" })).toBeVisible()
    expect(screen.getByText("@ada")).toBeVisible()
    expect(screen.getByText("AL")).toBeVisible()
  })

  it("offers Add Friend when there is no relationship", async () => {
    renderProfile()

    await userEvent.click(screen.getByRole("button", { name: "Add Friend" }))

    expect(mockAddFriend).toHaveBeenCalledTimes(1)
  })

  it("shows a disabled Request Sent for an outgoing request", () => {
    mockStatus.mockReturnValue({ status: "outgoing" })

    renderProfile()

    const button = screen.getByRole("button", { name: "Request Sent" })
    expect(button).toBeDisabled()
    expect(
      screen.queryByRole("button", { name: "Add Friend" }),
    ).not.toBeInTheDocument()
  })

  it("shows Accept Request for an incoming request", async () => {
    mockStatus.mockReturnValue({ status: "incoming" })

    renderProfile()

    await userEvent.click(
      screen.getByRole("button", { name: "Accept Request" }),
    )

    expect(mockAcceptFriend).toHaveBeenCalledTimes(1)
  })

  it("shows Message and Remove Friend once accepted", async () => {
    mockStatus.mockReturnValue({ status: "accepted" })

    renderProfile()

    expect(screen.getByRole("link", { name: "Message" })).toHaveAttribute(
      "href",
      "/dms/peer-id",
    )
    expect(
      screen.queryByRole("button", { name: "Add Friend" }),
    ).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Remove Friend" }))
    expect(mockRemoveFriend).toHaveBeenCalledTimes(1)
  })

  it("hides relation actions when viewing your own profile", () => {
    renderProfile("peer-id")

    expect(screen.getByText("This is you")).toBeVisible()
    expect(
      screen.queryByRole("button", { name: "Block" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Add Friend" }),
    ).not.toBeInTheDocument()
  })

  it("always exposes Block for other users", async () => {
    renderProfile()

    await userEvent.click(screen.getByRole("button", { name: "Block" }))

    expect(mockBlock).toHaveBeenCalledTimes(1)
  })
})
