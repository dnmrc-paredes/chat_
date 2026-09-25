import { render, screen } from "@testing-library/react"
import { TopNav } from "./TopNav"

const mockUsePathname = jest.fn(() => "/home")

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}))

describe("TopNav", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue("/home")
  })

  it("renders the home link on app routes", () => {
    render(<TopNav />)

    expect(screen.getByRole("link", { name: "chat_ home" })).toHaveAttribute(
      "href",
      "/home",
    )
  })

  it.each(["/", "/sign-in", "/sign-up"])("stays hidden on %s", (pathname) => {
    mockUsePathname.mockReturnValue(pathname)

    render(<TopNav />)

    expect(screen.queryByRole("link", { name: "chat_ home" })).toBeNull()
  })
})
