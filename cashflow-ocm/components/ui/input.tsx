import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "neural-focus h-11 md:h-10 w-full min-w-0 rounded-lg border border-stone-500 dark:border-stone-500 bg-white dark:bg-[#1E1E1E] px-3 text-base outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-900 disabled:opacity-50 aria-invalid:border-[var(--crit-fg)] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
