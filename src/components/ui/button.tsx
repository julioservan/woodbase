import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive" | "secondary";
type Size = "default" | "sm" | "lg" | "icon";

// Botones esqueuomórficos: degradado brillante, borde marcado, luz superior
// y sombra física; al pulsar se "hunden" (inset).
const variantClasses: Record<Variant, string> = {
  default:
    "border border-[#8a5a24] bg-gradient-to-b from-[#f0bd6b] to-[#cf8f33] text-[#3b2712] [text-shadow:0_1px_0_rgba(255,255,255,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_1px_3px_rgba(43,30,19,0.45)] hover:from-[#f4c67c] hover:to-[#d6993f] active:from-[#dda23f] active:to-[#c98c30] active:shadow-[inset_0_2px_5px_rgba(70,45,15,0.45)]",
  outline:
    "border border-[#b09468] bg-gradient-to-b from-[#fffdf5] to-[#efe4c9] text-foreground [text-shadow:0_1px_0_rgba(255,255,255,0.7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(43,30,19,0.3)] hover:to-[#f6eeda] active:shadow-[inset_0_2px_5px_rgba(90,70,40,0.3)]",
  ghost: "hover:bg-black/5 text-foreground",
  destructive:
    "border border-[#7e2617] bg-gradient-to-b from-[#d05a44] to-[#a33422] text-[#fff1ec] [text-shadow:0_-1px_0_rgba(0,0,0,0.3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(43,30,19,0.45)] hover:from-[#d96650] hover:to-[#ad3a26] active:shadow-[inset_0_2px_5px_rgba(60,15,5,0.5)]",
  secondary:
    "border border-[#b09468] bg-gradient-to-b from-[#f3ead4] to-[#e3d5b4] text-foreground [text-shadow:0_1px_0_rgba(255,255,255,0.6)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(43,30,19,0.3)] active:shadow-[inset_0_2px_5px_rgba(90,70,40,0.3)]",
};

const sizeClasses: Record<Size, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-lg px-6",
  icon: "h-9 w-9",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
