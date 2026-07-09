import { cn } from "@/lib/utils";

export function WoodPhoto({
  url,
  alt,
  className,
}: {
  url: string | null;
  alt: string;
  className?: string;
}) {
  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-accent to-muted",
          className,
        )}
      >
        {/* Anillos de crecimiento, a juego con el logo */}
        <svg
          viewBox="0 0 64 64"
          className="h-16 w-16 text-accent-foreground/30"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
        >
          <g transform="rotate(-8 34 31)">
            <ellipse cx="34" cy="31" rx="21" ry="18.5" strokeWidth="2.4" opacity="0.5" />
            <ellipse cx="34.5" cy="30.5" rx="15.5" ry="13.5" strokeWidth="2.1" opacity="0.7" />
            <ellipse cx="35" cy="30" rx="10.5" ry="9" strokeWidth="1.9" opacity="0.85" />
            <ellipse cx="35.4" cy="29.6" rx="6" ry="5" strokeWidth="1.7" />
          </g>
          <circle cx="34.6" cy="28.6" r="1.8" fill="currentColor" stroke="none" />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={cn("object-cover", className)} />
  );
}
