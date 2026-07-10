"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { CUT_LABELS, CUT_TYPES } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Props {
  q?: string;
  species?: string;
  cut?: string;
  scrap?: string;
  sort?: string;
  allSpecies: string[];
}

// Filtros sin botón: cada cambio actualiza la URL y el servidor re-renderiza
// el inventario. El buscador espera 350 ms desde la última tecla.
export function InventoryFilters({
  q,
  species,
  cut,
  scrap,
  sort,
  allSpecies,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  function apply(next: Partial<Record<keyof Omit<Props, "allSpecies">, string>>) {
    const merged = { q, species, cut, scrap, sort, ...next };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    });
  }

  const hasFilters = !!(q || species || cut || scrap || sort);

  return (
    <div className="panel-paper mb-8 space-y-3 rounded-2xl p-3 sm:p-4">
      <div className="relative">
        {isPending ? (
          <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          type="search"
          ref={searchRef}
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, especie, ubicación o notas..."
          className="h-10 pl-9"
          onChange={(e) => {
            const value = e.target.value;
            if (debounce.current) clearTimeout(debounce.current);
            debounce.current = setTimeout(() => apply({ q: value }), 350);
          }}
        />
      </div>
      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
        <Select
          value={species ?? ""}
          onChange={(e) => apply({ species: e.target.value })}
          className="sm:w-auto sm:min-w-32"
          aria-label="Filtrar por especie"
        >
          <option value="">Todas las especies</option>
          {allSpecies.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={cut ?? ""}
          onChange={(e) => apply({ cut: e.target.value })}
          className="sm:w-auto sm:min-w-32"
          aria-label="Filtrar por tipo de corte"
        >
          <option value="">Cualquier corte</option>
          {CUT_TYPES.map((c) => (
            <option key={c} value={c}>
              {CUT_LABELS[c]}
            </option>
          ))}
        </Select>
        <Select
          value={scrap ?? ""}
          onChange={(e) => apply({ scrap: e.target.value })}
          className="sm:w-auto sm:min-w-32"
          aria-label="Filtrar scraps"
        >
          <option value="">Todo el taller</option>
          <option value="only">Solo scraps</option>
          <option value="hide">Sin scraps</option>
        </Select>
        <Select
          value={sort ?? ""}
          onChange={(e) => apply({ sort: e.target.value })}
          className="sm:w-auto sm:min-w-32"
          aria-label="Ordenar"
        >
          <option value="">Más recientes</option>
          <option value="tipo">Por tipo de corte</option>
          <option value="especie">Por especie</option>
          <option value="nombre">Por nombre</option>
        </Select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              if (debounce.current) clearTimeout(debounce.current);
              if (searchRef.current) searchRef.current.value = "";
              apply({ q: "", species: "", cut: "", scrap: "", sort: "" });
            }}
            className="col-span-2 justify-self-center text-sm text-muted-foreground underline-offset-2 hover:underline sm:col-span-1"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
