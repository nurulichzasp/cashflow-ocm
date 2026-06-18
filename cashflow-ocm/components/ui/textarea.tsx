import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "neural-focus flex field-sizing-content min-h-16 w-full rounded-lg border border-stone-500 dark:border-stone-500 bg-white dark:bg-[#1E1E1E] px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-900 disabled:opacity-50 aria-invalid:border-[var(--crit-fg)] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
