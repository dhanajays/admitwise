import type { ChanceBand } from "@/lib/predictor/types"
import { cn } from "@/lib/utils"

const styles: Record<ChanceBand, string> = {
  "Very High":
    "bg-green-100 text-green-700 border-green-300",

  High:
    "bg-emerald-100 text-emerald-700 border-emerald-300",

  Moderate:
    "bg-blue-100 text-blue-700 border-blue-300",

  Low:
    "bg-yellow-100 text-yellow-700 border-yellow-300",

  "Very Low":
    "bg-red-100 text-red-700 border-red-300",
}

export function ChanceBadge({
  band,
  className,
}: {
  band: ChanceBand
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        styles[band],
        className
      )}
    >
      {band}
    </span>
  )
}