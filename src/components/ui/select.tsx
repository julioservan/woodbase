import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full appearance-none rounded-lg border border-[#b09468] bg-gradient-to-b from-[#fffdf5] to-[#efe4c9] px-3 py-1 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(43,30,19,0.3)] transition-shadow focus-visible:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0_0_3px_rgba(226,169,79,0.45)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
