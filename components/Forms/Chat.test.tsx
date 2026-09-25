import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { ChatForm } from "./Chat"

const mockSendMessage = jest.fn()
const mockSetInputText = jest.fn()

const mockChannel = jest.fn(() => ({
  inputText: "",
  setInputText: mockSetInputText,
  sendMessage: mockSendMessage,
  isConnected: true,
}))

jest.mock("@/components/Providers/Lobby", () => ({
  useLobbyChannel: () => mockChannel(),
}))

jest.mock("sonner", () => ({ toast: jest.fn() }))

const toastMock = toast as jest.MockedFunction<typeof toast>

const renderForm = (
  overrides: Partial<ReturnType<typeof mockChannel>> = {},
) => {
  mockChannel.mockReturnValue({
    inputText: "",
    setInputText: mockSetInputText,
    sendMessage: mockSendMessage,
    isConnected: true,
    ...overrides,
  })

  const result = render(<ChatForm />)

  const submitButton = () =>
    result.container.querySelector('button[type="submit"]') as HTMLButtonElement

  return { ...result, submitButton }
}

describe("ChatForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows the character counter against the limit", () => {
    renderForm({ inputText: "hello" })

    expect(screen.getByText("5/500")).toBeVisible()
  })

  it("counts trimmed length, ignoring surrounding whitespace", () => {
    renderForm({ inputText: "   hello   " })

    expect(screen.getByText("5/500")).toBeVisible()
  })

  it("marks the counter as destructive once over the limit", () => {
    renderForm({ inputText: "a".repeat(501) })

    expect(screen.getByText("501/500")).toHaveClass("text-destructive")
  })

  it("sends the trimmed message and clears the input", async () => {
    const { submitButton } = renderForm({ inputText: "  hello  " })

    await userEvent.click(submitButton())

    expect(mockSendMessage).toHaveBeenCalledWith("hello")
    expect(mockSetInputText).toHaveBeenCalledWith("")
  })

  it("does not send an empty or whitespace-only message", async () => {
    const { submitButton } = renderForm({ inputText: "   " })

    await userEvent.click(submitButton())

    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it("rejects a message over the limit instead of sending it", async () => {
    const { submitButton } = renderForm({ inputText: "a".repeat(501) })

    await userEvent.click(submitButton())

    expect(mockSendMessage).not.toHaveBeenCalled()
    expect(toastMock).toHaveBeenCalledWith("Message is too long.")
  })

  it("disables the input while disconnected", () => {
    renderForm({ isConnected: false })

    expect(
      screen.getByPlaceholderText("Send what's on your mind."),
    ).toBeDisabled()
  })

  it("enables the input while connected", () => {
    renderForm({ isConnected: true })

    expect(
      screen.getByPlaceholderText("Send what's on your mind."),
    ).toBeEnabled()
  })
})
