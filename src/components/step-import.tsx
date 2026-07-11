"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Loader2, RotateCw, Trash2 } from "lucide-react";
import { parseStep, type DetectedPart } from "@/lib/step";
import { importParts } from "@/app/projects/actions";
import {
  cn,
  formatInches,
  NON_WOOD_MATERIALS,
  SPECIES_OPTIONS,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

// Cada dimensión de la caja puede hacer de grosor: girar la pieza cambia qué
// eje sigue la veta, igual que se giraría la tabla en el taller.
const ROTATIONS: [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 2, 0],
];

interface ReviewRow {
  include: boolean;
  name: string;
  quantity: number;
  dims: [number, number, number];
  rotation: number;
  species: string;
  note?: string;
}

function rowDims(row: ReviewRow): [number, number, number] {
  const [li, wi, ti] = ROTATIONS[row.rotation % 3];
  return [row.dims[li], row.dims[wi], row.dims[ti]];
}

export function StepImport({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyNote, setVerifyNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setVerifyNote(null);
    let detected: DetectedPart[];
    try {
      detected = parseStep(await file.text());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo leer el archivo",
      );
      return;
    }
    setFileName(file.name);
    setRows(
      detected.map((p) => ({
        include: true,
        name: p.name,
        quantity: p.quantity,
        dims: p.dims,
        rotation: 0,
        species: "",
      })),
    );

    // Revisión de sentido común con Claude: gira grosores implausibles,
    // marca herrajes como comprados y avisa de piezas curvas/en L.
    setVerifying(true);
    try {
      const res = await fetch("/api/verify-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parts: detected.map((p) => ({
            name: p.name,
            quantity: p.quantity,
            dims: p.dims,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      const data: {
        parts: {
          name: string;
          rotation: number;
          suggested_material: string;
          note: string;
        }[];
      } = await res.json();
      setRows((prev) =>
        prev
          ? prev.map((row) => {
              const v = data.parts.find(
                (p) =>
                  p.name.trim().toLowerCase() === row.name.trim().toLowerCase(),
              );
              if (!v) return row;
              return {
                ...row,
                rotation:
                  v.rotation >= 0 && v.rotation <= 2 ? v.rotation : row.rotation,
                species:
                  v.suggested_material !== "madera"
                    ? v.suggested_material
                    : row.species,
                note: v.note || undefined,
              };
            })
          : prev,
      );
      setVerifyNote("Medidas revisadas por la IA — repasa sus notas y ajusta lo que veas.");
    } catch {
      setVerifyNote(
        "La revisión con IA no está disponible ahora; revisa los grosores a mano.",
      );
    } finally {
      setVerifying(false);
    }
  }

  function update(index: number, patch: Partial<ReviewRow>) {
    setRows((prev) =>
      prev ? prev.map((r, i) => (i === index ? { ...r, ...patch } : r)) : prev,
    );
  }

  function confirm() {
    if (!rows) return;
    const selected = rows
      .filter((r) => r.include)
      .map((r) => {
        const [lengthIn, widthIn, thicknessIn] = rowDims(r);
        return {
          name: r.name,
          quantity: r.quantity,
          lengthIn,
          widthIn,
          thicknessIn,
          species: r.species || null,
        };
      });
    startTransition(async () => {
      await importParts(projectId, selected);
      setRows(null);
      setFileName("");
    });
  }

  if (!rows) {
    return (
      <div className="space-y-1.5">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#a5865a]/60 px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground",
            dragging && "border-primary bg-accent/50 text-foreground",
          )}
        >
          <FileUp className="h-6 w-6 opacity-60" />
          <span>
            <span className="font-semibold">Importar STEP de Shapr3D</span>
            <br />
            arrastra el archivo aquí o toca para elegirlo
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".step,.stp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">
          {fileName} · {rows.length}{" "}
          {rows.length === 1 ? "grupo de piezas" : "grupos de piezas"}
        </p>
        <button
          type="button"
          onClick={() => setRows(null)}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Cancelar
        </button>
      </div>
      {verifying && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Revisando medidas y
          materiales con la IA…
        </p>
      )}
      {!verifying && verifyNote && (
        <p className="text-xs text-muted-foreground">{verifyNote}</p>
      )}

      <ul className="divide-y divide-[#c9b28c]/60">
        {rows.map((row, i) => {
          const [L, W, T] = rowDims(row);
          const suspicious = T > 2;
          return (
            <li
              key={i}
              className={cn(
                "space-y-2 py-3",
                !row.include && "opacity-45",
              )}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.include}
                  onChange={(e) => update(i, { include: e.target.checked })}
                  className="h-4 w-4 shrink-0 accent-primary"
                  aria-label={`Incluir ${row.name}`}
                />
                <Input
                  value={row.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  className="h-9 flex-1 sm:h-8"
                  aria-label="Nombre de la pieza"
                />
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={row.quantity}
                  onChange={(e) =>
                    update(i, { quantity: Number(e.target.value) || 1 })
                  }
                  className="h-9 w-16 sm:h-8"
                  aria-label="Cantidad"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-6 text-sm">
                <span className="tabular-nums font-medium">
                  {formatInches(L)}″ × {formatInches(W)}″ ×{" "}
                  <span className={suspicious ? "rounded bg-amber/30 px-1 font-bold text-[#8a5a24]" : ""}>
                    {formatInches(T)}″
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => update(i, { rotation: (row.rotation + 1) % 3 })}
                  className="inline-flex items-center gap-1 rounded-md border border-[#b09468] bg-gradient-to-b from-[#fffdf5] to-[#efe4c9] px-2 py-0.5 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(43,30,19,0.3)] transition-all hover:to-[#f6eeda]"
                  title="Girar qué lado es el grosor (dirección de la veta)"
                >
                  <RotateCw className="h-3 w-3" /> Girar veta
                </button>
                {row.note ? (
                  <span className="text-xs font-medium text-[#8a5a24]">
                    ⚠ {row.note}
                  </span>
                ) : (
                  suspicious && (
                    <span className="text-xs font-medium text-[#8a5a24]">
                      ⚠ ¿grosor real? gira la pieza o revisa (¿curva/en L?)
                    </span>
                  )
                )}
                <Select
                  value={row.species}
                  onChange={(e) => update(i, { species: e.target.value })}
                  className="h-8 w-auto min-w-32 text-xs sm:h-7"
                  aria-label="Especie o material"
                >
                  <option value="">Especie…</option>
                  {SPECIES_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <optgroup label="Otros materiales">
                    {NON_WOOD_MATERIALS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </optgroup>
                </Select>
                <button
                  type="button"
                  onClick={() => update(i, { include: false })}
                  className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Descartar ${row.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={confirm}
          disabled={isPending || rows.every((r) => !r.include)}
          className="h-10 rounded-lg px-5 sm:h-9"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Añadir {rows.filter((r) => r.include).length} al despiece
        </Button>
        <p className="text-xs text-muted-foreground">
          «Girar veta» cambia qué lado es el grosor, como girarías la tabla.
        </p>
      </div>
    </div>
  );
}
