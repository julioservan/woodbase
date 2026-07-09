import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-20 w-full rounded-lg border border-[#b89a6f] bg-gradient-to-b from-[#f5efdd] to-[#fffdf6] px-3 py-2 text-sm shadow-[inset_0_2px_4px_rgba(88,62,32,0.22)] transition-shadow placeholder:text-muted-foreground focus-visible:shadow-[inset_0_2px_4px_rgba(88,62,32,0.22),0_0_0_3px_rgba(226,169,79,0.45)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
