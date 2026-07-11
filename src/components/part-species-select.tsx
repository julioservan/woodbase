"use client";

import { useTransition } from "react";
import { updatePartSpecies } from "@/app/projects/actions";
import { SPECIES_OPTIONS } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Selector rápido de especie en cada fila del despiece: guarda al cambiar.
// Las especies que ya tienes en el inventario salen primero.
export function PartSpeciesSelect({
  projectId,
  partId,
  species,
  inventorySpecies,
}: {
  projectId: string;
  partId: string;
  species: string | null;
  inventorySpecies: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const inInventory = new Set(inventorySpecies.map((s) => s.toLowerCase()));
  const rest = SPECIES_OPTIONS.filter((s) => !inInventory.has(s.toLowerCase()));
  const current = species ?? "";
  const known =
    !current ||
    inventorySpecies.some((s) => s.toLowerCase() === current.toLowerCase()) ||
    rest.some((s) => s.toLowerCase() === current.toLowerCase());

  return (
    <select
      value={current}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() =>
          updatePartSpecies(projectId, partId, e.target.value),
        )
      }
      aria-label="Especie de la pieza"
      className={cn(
        "h-7 appearance-none rounded-md border border-[#b09468] bg-gradient-to-b from-[#fffdf5] to-[#efe4c9] px-2 text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(43,30,19,0.3)] transition-opacity disabled:opacity-50",
        !current && "text-muted-foreground",
      )}
    >
      <option value="">cualquier madera</option>
      {inventorySpecies.length > 0 && (
        <optgroup label="En tu inventario">
          {inventorySpecies.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Otras">
        {rest.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
        {!known && <option value={current}>{current}</option>}
      </optgroup>
    </select>
  );
}
