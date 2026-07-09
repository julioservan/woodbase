import { TreePine } from "lucide-react";
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
          "flex items-center justify-center bg-accent text-accent-foreground/40",
          className,
        )}
      >
        <TreePine className="h-10 w-10" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={cn("object-cover", className)} />
  );
}
