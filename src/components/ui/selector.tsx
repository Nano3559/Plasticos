import { cn } from "@/lib/utils"

/** <select> nativo con el mismo aspecto que los campos de texto. */
export function Selector({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-line-strong bg-panel px-3 text-base text-fg outline-none transition-[border-color,box-shadow] md:text-sm",
        "hover:border-subdued focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
