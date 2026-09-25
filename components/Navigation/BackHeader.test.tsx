import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BackHeader } from "./BackHeader"

const mockBack = jest.fn()
const mockUsePathname = jest.fn<string, []>()
const mockUseHasNavigated = jest.fn<boolean, []>()

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ back: mockBack }),
}))

jest.mock("@/components/Providers/Navigation", () => ({
  useHasNavigated: () => mockUseHasNavigated(),
}))

describe("BackHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseHasNavigated.mockReturnValue(true)
    mockUsePathname.mockReturnValue("/friends")
  })

  it("renders the back button after navigating away from a root route", async () => {
    render(<BackHeader />)

    await userEvent.click(screen.getByRole("button", { name: "Back" }))

    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it.each(["/", "/home", "/sign-in", "/sign-up", "/dms", "/dms/abc123"])(
    "stays hidden on %s",
    (pathname) => {
      mockUsePathname.mockReturnValue(pathname)

      render(<BackHeader />)

      expect(
        screen.queryByRole("button", { name: "Back" }),
      ).not.toBeInTheDocument()
    },
  )

  it("stays hidden on the very first page view", () => {
    mockUseHasNavigated.mockReturnValue(false)

    render(<BackHeader />)

    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument()
  })
})
