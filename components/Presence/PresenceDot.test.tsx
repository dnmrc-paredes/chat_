import { render } from "@testing-library/react"
import { PresenceDot } from "./PresenceDot"

describe("PresenceDot", () => {
  it("renders the online indicator when the user is online", () => {
    const { container } = render(<PresenceDot isOnline />)

    expect(container.firstChild).toHaveClass("bg-green-500")
  })

  it("renders the muted indicator when the user is offline", () => {
    const { container } = render(<PresenceDot isOnline={false} />)

    expect(container.firstChild).toHaveClass("bg-muted")
  })

  it("hides the dot from assistive technology", () => {
    const { container } = render(<PresenceDot isOnline />)

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true")
  })
})
