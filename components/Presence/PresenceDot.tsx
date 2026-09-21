import { cn } from "@/lib/utils"

export const PresenceDot = ({ isOnline }: { isOnline: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background",
      isOnline ? "bg-green-500" : "bg-muted",
    )}
  />
)
