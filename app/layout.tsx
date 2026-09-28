import type { Metadata } from "next"
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { BackHeader } from "@/components/Navigation/BackHeader"
import { TopNav } from "@/components/Navigation/TopNav"
import { NavigationProvider } from "@/components/Providers/Navigation"
import { OnlinePresenceProvider } from "@/components/Providers/Online"
import { ThemeProvider } from "@/components/Providers/Theme"
import { Toaster } from "@/components/ui/sonner"
import type { ReactNode } from "react"

const jetbrainsMonoHeading = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  preload: true,
})

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

const title = "chat_"
const description = "Jump into the lobby, meet people, and talk in private."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | chat_",
  },
  description,
  openGraph: {
    type: "website",
    siteName: title,
    title,
    description,
    url: "/",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: `${title} — ${description}`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/android-chrome-512x512.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      {
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  // Every page sits behind authentication, so there is nothing here worth
  // indexing and the sign-in/sign-up routes should stay out of search results.
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        jetbrainsMonoHeading.variable,
      )}
    >
      <body className="min-h-full bg-[color-background] flex justify-center items-center">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableColorScheme
          disableTransitionOnChange
        >
          <Toaster />
          <OnlinePresenceProvider />
          <div className="flex justify-center items-center w-full relative">
            <div className="flex w-full max-w-150 flex-col">
              <NavigationProvider>
                <TopNav />
                <BackHeader />
                {children}
              </NavigationProvider>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
