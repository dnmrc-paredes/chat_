import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?"

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 30)

export const deriveHandle = (
  username: string | null | undefined,
  name: string,
  id: string,
) =>
  username ||
  name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20) ||
  id.slice(0, 8)

export const conversationPair = (a: string, b: string): [string, string] =>
  a < b ? [a, b] : [b, a]

export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
