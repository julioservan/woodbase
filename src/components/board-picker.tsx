"use client";

import { useState, useTransition } from "react";
import { ChevronUp, Loader2, Plus } from "lucide-react";
import { updateProjectBoards } from "@/app/projects/actions";
import { formatInches } from "@/lib/utils";

interface BoardOption {
  id: string;
  name: string;
  species: string | null;
  lengthIn: number | null;
  widthIn: number | null;
  thicknessIn: number | null;
  quantity: number;
  unit: string;
  isScrap: boolean;
  photoUrl: string | null;
}

const SINGULAR: Record<string, string> = {
  tablones: "tablón",
  piezas: "pieza",
  unidades: "unidad",
  planchas: "plancha",
  paneles: "panel",
  bloques: "bloque",
  palos: "palo",
};

function formatQuantity(quantity: number, unit: string) {
  const n = Number.isInteger(quantity) ? quantity : quantity.toFixed(1);
  const u = quantity === 1 ? (SINGULAR[unit.toLowerCase()] ?? unit) : unit;
  return `${n} ${u}`;
}

// Maderas del inventario elegidas para el proyecto: el plan de corte solo
// usa las marcadas; sin ninguna marcada, usa todo el taller.
export function BoardPicker({
  projectId,
  boards,
  selected,
}: {
  projectId: string;
  boards: BoardOption[];
  selected: string[];
}) {
  const [ids, setIds] = useState<Set<string>>(new Set(selected));
  // Con maderas elegidas, la vista se simplifica: solo las elegidas; el
  // resto se despliega bajo demanda para añadir más.
  const [showAll, setShowAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    const next = new Set(ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setIds(next);
    startTransition(() => updateProjectBoards(projectId, [...next]));
  }

  function clear() {
    setIds(new Set());
    setShowAll(false);
    startTransition(() => updateProjectBoards(projectId, []));
  }

  const sorted = [...boards].sort(
    (a, b) =>
      (a.species ?? "￿").localeCompare(b.species ?? "￿", "es") ||
      a.name.localeCompare(b.name, "es"),
  );
  const compact = ids.size > 0 && !showAll;
  const visible = compact ? sorted.filter((b) => ids.has(b.id)) : sorted;
  const hiddenCount = sorted.length - ids.size;

  return (
    <div className="panel-paper rounded-2xl p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="eyebrow text-letterpress text-muted-foreground">
          Maderas a usar
          {isPending && (
            <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
          )}
        </h3>
        {ids.size > 0 ? (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Usar todo el taller
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Sin selección: se usa todo el taller
          </span>
        )}
      </div>
      <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {visible.map((b) => {
          const dims =
            b.lengthIn != null && b.widthIn != null && b.thicknessIn != null
              ? `${formatInches(b.lengthIn)}″ × ${formatInches(b.widthIn)}″ × ${formatInches(b.thicknessIn)}″`
              : "sin medidas";
          const usable = dims !== "sin medidas";
          return (
            <li key={b.id}>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm transition-colors hover:bg-accent/50 ${usable ? "" : "opacity-45"}`}
              >
                <input
                  type="checkbox"
                  checked={ids.has(b.id)}
                  onChange={() => toggle(b.id)}
                  disabled={!usable}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-background/60">
                  {b.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.photoUrl}
                      alt=""
                      loading="lazy"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[9px] uppercase text-muted-foreground/60">
                      sin foto
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold">{b.name}</span>
                  {b.isScrap && (
                    <span className="ml-1.5 rounded-[3px] border border-[#a83c2a]/60 px-1 text-[9px] font-black uppercase tracking-wide text-[#a83c2a]/75 align-middle">
                      Scrap
                    </span>
                  )}
                  <span className="block text-xs tabular-nums text-muted-foreground">
                    {dims} · {formatQuantity(b.quantity, b.unit)}
                    {b.species ? ` · ${b.species}` : ""}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {ids.size > 0 &&
        (compact ? (
          hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-[#a5865a]/70 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[#a5865a] hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Añadir más maderas (
              {hiddenCount} más)
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronUp className="h-3.5 w-3.5" /> Ver solo las elegidas
          </button>
        ))}
    </div>
  );
}
