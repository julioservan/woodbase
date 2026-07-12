"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
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
    startTransition(() => updateProjectBoards(projectId, []));
  }

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
        {[...boards]
          .sort(
            (a, b) =>
              (a.species ?? "￿").localeCompare(b.species ?? "￿", "es") ||
              a.name.localeCompare(b.name, "es"),
          )
          .map((b) => {
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
                  <span className="block truncate text-xs tabular-nums text-muted-foreground">
                    {dims}
                    {b.species ? ` · ${b.species}` : ""}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
