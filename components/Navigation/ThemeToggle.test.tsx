import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeToggle } from "./ThemeToggle"

const mockSetTheme = jest.fn()
const mockResolvedTheme = jest.fn(() => "light" as string | undefined)

jest.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: mockResolvedTheme(),
    setTheme: mockSetTheme,
  }),
}))

describe("ThemeToggle", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResolvedTheme.mockReturnValue("light")
  })

  it("offers switching to dark mode while in the light theme", async () => {
    render(<ThemeToggle />)

    await userEvent.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    )

    expect(mockSetTheme).toHaveBeenCalledWith("dark")
  })

  it("offers switching to light mode while in the dark theme", async () => {
    mockResolvedTheme.mockReturnValue("dark")

    render(<ThemeToggle />)

    await userEvent.click(
      screen.getByRole("button", { name: "Switch to light mode" }),
    )

    expect(mockSetTheme).toHaveBeenCalledWith("light")
  })
})
