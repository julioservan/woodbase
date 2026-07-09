import * as React from "react";
import { cn } from "@/lib/utils";

// Campos "hundidos" en el papel: sombra interior y foco con halo ámbar.
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-lg border border-[#b89a6f] bg-gradient-to-b from-[#f5efdd] to-[#fffdf6] px-3 py-1 text-sm shadow-[inset_0_2px_4px_rgba(88,62,32,0.22)] transition-shadow placeholder:text-muted-foreground focus-visible:shadow-[inset_0_2px_4px_rgba(88,62,32,0.22),0_0_0_3px_rgba(226,169,79,0.45)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
