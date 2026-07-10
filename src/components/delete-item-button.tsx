"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteItemButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      aria-label="Borrar pieza"
      title="Borrar pieza"
      className="h-9 w-9 rounded-lg p-0"
      disabled={isPending}
      onClick={() => {
        if (confirm("¿Seguro que quieres borrar esta pieza? No se puede deshacer.")) {
          startTransition(() => action());
        }
      }}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
