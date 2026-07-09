import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "green" | "yellow" | "blue";

const variantClasses: Record<Variant, string> = {
  default: "bg-accent text-accent-foreground",
  secondary: "bg-muted text-muted-foreground",
  outline: "border border-border text-foreground",
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-amber-100 text-amber-800",
  blue: "bg-sky-100 text-sky-800",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export function moistureBadgeVariant(
  state: "verde" | "secando" | "seco" | null,
): Variant {
  switch (state) {
    case "verde":
      return "green";
    case "secando":
      return "yellow";
    case "seco":
      return "blue";
    default:
      return "secondary";
  }
}
