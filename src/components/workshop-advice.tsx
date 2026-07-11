"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { updatePartSpecies } from "@/app/projects/actions";
import { Button } from "@/components/ui/button";

interface Suggestion {
  part_name: string;
  species: string;
  reason: string;
}

interface Advice {
  advice: string[];
  species_suggestions: Suggestion[];
}

// Consejo del taller: Claude opina sobre el plan (valor de las tablas, veta,
// estructura) y sugiere especies por pieza que se aplican con un toque.
export function WorkshopAdvice({
  projectId,
  parts,
}: {
  projectId: string;
  parts: { id: string; name: string }[];
}) {
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  async function ask() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo obtener el consejo");
      setAdvice(data as Advice);
      setApplied(new Set());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo obtener el consejo",
      );
    } finally {
      setLoading(false);
    }
  }

  function findPart(name: string) {
    const clean = name.trim().toLowerCase();
    return parts.find((p) => p.name.trim().toLowerCase() === clean);
  }

  function apply(s: Suggestion) {
    const part = findPart(s.part_name);
    if (!part) return;
    startTransition(async () => {
      await updatePartSpecies(projectId, part.id, s.species);
      setApplied((prev) => new Set(prev).add(s.part_name));
    });
  }

  return (
    <div className="panel-paper space-y-3 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="eyebrow text-letterpress text-muted-foreground">
          Consejo del taller
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={ask}
          disabled={loading}
          className="h-9 rounded-lg px-4"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          )}
          {advice ? "Pedir otra opinión" : "Pedir consejo a la IA"}
        </Button>
      </div>

      {!advice && !error && !loading && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Claude revisa el despiece, tu inventario y el plan de corte, y opina
          como carpintero: qué tablas merecen cada pieza, veta, encolados y qué
          comprar si falta.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {advice && (
        <div className="space-y-3">
          <ul className="space-y-1.5 text-sm leading-relaxed">
            {advice.advice.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">›</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
          {advice.species_suggestions.length > 0 && (
            <div className="space-y-1.5 border-t border-[#c9b28c]/60 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Especies sugeridas
              </p>
              {advice.species_suggestions.map((s, i) => {
                const part = findPart(s.part_name);
                const done = applied.has(s.part_name);
                return (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold">{s.part_name}</span> →{" "}
                      <span className="text-primary">{s.species}</span>
                      <span className="block text-xs text-muted-foreground">
                        {s.reason}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => apply(s)}
                      disabled={!part || done || isPending}
                      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[#b09468] bg-gradient-to-b from-[#fffdf5] to-[#efe4c9] px-2.5 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(43,30,19,0.3)] transition-all hover:to-[#f6eeda] disabled:opacity-50"
                    >
                      {done ? (
                        <>
                          <Check className="h-3 w-3 text-[#4a7a3a]" /> Aplicado
                        </>
                      ) : part ? (
                        "Aplicar"
                      ) : (
                        "Pieza no encontrada"
                      )}
                    </button>
                  </div>
                );
              })}
              <p className="pt-1 text-xs text-muted-foreground">
                Tras aplicar, vuelve a optimizar para recalcular el plan.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
