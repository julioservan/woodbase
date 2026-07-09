import * as React from "react";
import { cn, CUT_LABELS, type CutType } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline";

const variantClasses: Record<Variant, string> = {
  default: "bg-accent text-accent-foreground",
  secondary: "bg-muted text-muted-foreground",
  outline: "border border-border bg-card/60 text-muted-foreground",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export function CutBadge({
  cut,
  className,
}: {
  cut: CutType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground/80",
        className,
      )}
    >
      {CUT_LABELS[cut]}
    </span>
  );
}
