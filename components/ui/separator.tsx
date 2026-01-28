import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
    React.ElementRef<typeof SeparatorPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
    (
        { className, orientation = "horizontal", ...props },
        ref
    ) => (
        <SeparatorPrimitive.Root
            ref={ref}
            // decorative={decorative} // removed decorative prop to match radix api or let it fall through props
            // Wait, Radix Separator has decorative prop. I'll let it pass through.
            // But adding decorative to the destructuring and giving it a default.
            decorative={true}
            orientation={orientation}
            className={cn(
                "shrink-0 bg-border",
                orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
                className
            )}
            {...props}
        />
    )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
