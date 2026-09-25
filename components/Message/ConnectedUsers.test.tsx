import { render, screen } from "@testing-library/react"
import { ConnectedUsers } from "./ConnectedUsers"

const mockConnectedUsers = jest.fn(
  () => [] as { user_id: string; name: string }[],
)

jest.mock("../Providers/Lobby", () => ({
  useLobbyChannel: () => ({ connectedUsers: mockConnectedUsers() }),
}))

const buildUsers = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    user_id: `user-${index}`,
    name: `User Number ${index}`,
  }))

describe("ConnectedUsers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows a connecting state when nobody is connected", () => {
    mockConnectedUsers.mockReturnValue([])

    render(<ConnectedUsers />)

    expect(screen.getByText("Connecting...")).toBeVisible()
  })

  it("shows the connected user count", () => {
    mockConnectedUsers.mockReturnValue(buildUsers(3))

    render(<ConnectedUsers />)

    expect(screen.getByText("3 connected")).toBeVisible()
  })

  it("caps the avatar list at ten users", () => {
    mockConnectedUsers.mockReturnValue(buildUsers(15))

    render(<ConnectedUsers />)

    expect(screen.getByText("15 connected")).toBeVisible()
    expect(screen.getByText("10+")).toBeVisible()
    expect(screen.queryByTitle("User Number 10")).not.toBeInTheDocument()
  })

  it("does not render an overflow badge at or below the avatar cap", () => {
    mockConnectedUsers.mockReturnValue(buildUsers(10))

    render(<ConnectedUsers />)

    expect(screen.queryByText(/\+\s*$/)).not.toBeInTheDocument()
  })
})
