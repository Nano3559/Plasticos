import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border border-line-strong bg-panel px-3 py-1 text-base text-fg transition-[border-color,box-shadow] outline-none placeholder:text-muted md:text-sm",
        "hover:border-subdued focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Input }
