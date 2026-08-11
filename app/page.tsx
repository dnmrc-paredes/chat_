import Link from "next/link"

export default function Home() {
  return (
    <div className="h-dvh flex flex-col items-center justify-center p-2">
      <div className="flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center justify-center">
          <h1 className="font-heading text-[80px]">chat_</h1>
          <p className="font-mono">Meet new people.</p>
        </div>
        <div className="flex gap-4 items-center">
          <Link
            href="/sign-in"
            className="bg-foreground text-background px-4 py-2 rounded-sm"
          >
            Sign In
          </Link>
          <span> or </span>
          <Link
            href="/sign-up"
            className="bg-foreground text-background px-4 py-2 rounded-sm"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}
