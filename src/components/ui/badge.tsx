import * as React from "react";
import { cn } from "@/lib/utils";

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

const MOISTURE_META: Record<
  "verde" | "secando" | "seco",
  { label: string; dot: string }
> = {
  verde: { label: "Verde", dot: "bg-emerald-500" },
  secando: { label: "Secando", dot: "bg-amber" },
  seco: { label: "Seco", dot: "bg-sky-600" },
};

export function MoistureBadge({
  state,
  className,
}: {
  state: "verde" | "secando" | "seco";
  className?: string;
}) {
  const meta = MOISTURE_META[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground/80",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
