"use client";

import { useState, useTransition } from "react";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import type { WoodItem } from "@/lib/db/schema";
import {
  cn,
  CUT_LABELS,
  CUT_TYPES,
  DISPLAY_SIZES,
  formatInches,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface IdentifyResult {
  species: string;
  scientific_name: string;
  confidence: number;
  alternatives: { species: string; confidence: number }[];
  reasoning: string;
}

// Especies habituales: clásicas de EE. UU. + las del taller, en formato
// "inglés (español)". Si falta alguna, la opción "Otra…" abre campo libre.
const SPECIES_OPTIONS = [
  "ash (fresno)",
  "beech (haya)",
  "birch (abedul)",
  "bocote",
  "bubinga",
  "cedar (cedro)",
  "cherry (cerezo)",
  "claro walnut (nogal claro)",
  "cocobolo",
  "douglas fir (abeto de Douglas)",
  "granadillo",
  "hickory (pacana)",
  "mahogany (caoba)",
  "mango",
  "maple (arce)",
  "narra",
  "olive (olivo)",
  "padauk",
  "pine (pino)",
  "poplar (álamo)",
  "purpleheart (amaranto)",
  "red oak (roble rojo)",
  "sande",
  "sapele (sapeli)",
  "siberian elm (olmo siberiano)",
  "sucupira",
  "teak (teca)",
  "walnut (nogal)",
  "wenge (wengué)",
  "white oak (roble blanco)",
  "zebrawood (cebrano)",
];

const UNIT_OPTIONS = [
  "tablones",
  "piezas",
  "paneles",
  "pies tablares",
  "pies lineales",
  "pies cuadrados",
];

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel-paper space-y-4 rounded-2xl p-4 sm:p-5">
      <h2 className="eyebrow text-letterpress text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function ItemForm({
  item,
  action,
  submitLabel,
}: {
  item?: WoodItem;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    item?.photoUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [species, setSpecies] = useState(item?.species ?? "");
  // "Otra…" abre un campo libre para especies fuera de la lista.
  const [customSpecies, setCustomSpecies] = useState(
    !!item?.species && !SPECIES_OPTIONS.includes(item.species),
  );
  const [speciesConfidence, setSpeciesConfidence] = useState<string>(
    item?.speciesConfidence != null ? String(item.speciesConfidence) : "",
  );
  const [identifying, setIdentifying] = useState(false);
  const [identifyResult, setIdentifyResult] = useState<IdentifyResult | null>(
    null,
  );
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  const [displaySize, setDisplaySize] = useState(item?.displaySize ?? "xl");

  const [isPending, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir la foto");
      setPhotoUrl(data.url);
      setIdentifyResult(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al subir la foto");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleIdentify() {
    if (!photoUrl) return;
    setIdentifying(true);
    setIdentifyError(null);
    setIdentifyResult(null);
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al identificar");
      const result = data as IdentifyResult;
      setIdentifyResult(result);
      setSpecies(result.species);
      setCustomSpecies(!SPECIES_OPTIONS.includes(result.species));
      setSpeciesConfidence(result.confidence.toFixed(2));
    } catch (err) {
      setIdentifyError(
        err instanceof Error ? err.message : "Error al identificar",
      );
    } finally {
      setIdentifying(false);
    }
  }

  function applyAlternative(alt: { species: string; confidence: number }) {
    setSpecies(alt.species);
    setCustomSpecies(!SPECIES_OPTIONS.includes(alt.species));
    setSpeciesConfidence(alt.confidence.toFixed(2));
  }

  return (
    <form
      action={(formData) => startTransition(() => action(formData))}
      className="space-y-5"
    >
      <FormSection title="Foto e identificación">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative mx-auto aspect-square w-full max-w-56 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted shadow-sm sm:mx-0">
            {photoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="Foto de la pieza"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute right-2 top-2 rounded-full bg-walnut/70 p-1.5 text-walnut-foreground backdrop-blur-sm transition-colors hover:bg-walnut"
                  aria-label="Quitar foto"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:bg-accent/60">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card shadow-sm">
                      <Camera className="h-5 w-5" />
                    </span>
                    <span className="px-4 text-center text-xs leading-relaxed">
                      Toca para hacer una foto
                      <br />o subir una imagen
                    </span>
                  </>
                )}
                {/* Sin `capture`: iOS ofrece elegir de la galería o hacer foto */}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
          <div className="flex-1 space-y-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handleIdentify}
              disabled={!photoUrl || identifying || uploading}
            >
              {identifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              {identifying ? "Identificando..." : "Identificar especie con IA"}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              La IA analiza la foto y sugiere la especie. Es una estimación
              orientativa: revísala y corrígela si hace falta antes de guardar.
            </p>
            <div className="space-y-1.5 pt-1">
              <Label>Tamaño en la estantería</Label>
              <div className="flex gap-1.5">
                {DISPLAY_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDisplaySize(s)}
                    aria-pressed={displaySize === s}
                    className={cn(
                      "h-10 w-12 rounded-lg border text-sm font-bold uppercase transition-all sm:h-9 sm:w-11",
                      displaySize === s
                        ? "brass"
                        : "border-[#b09468] bg-gradient-to-b from-[#fffdf5] to-[#efe4c9] text-foreground/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(43,30,19,0.3)] hover:to-[#f6eeda]",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Cómo de grande se dibuja la pieza en su balda (XL = tamaño
                actual).
              </p>
              <input type="hidden" name="displaySize" value={displaySize} />
            </div>
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
            {identifyError && (
              <p className="text-sm text-destructive">{identifyError}</p>
            )}
            {identifyResult && (
              <div className="space-y-2 rounded-xl border border-amber/40 bg-accent/60 p-3 text-sm">
                <p>
                  <span className="font-semibold">
                    {identifyResult.species}
                  </span>{" "}
                  <span className="italic text-muted-foreground">
                    ({identifyResult.scientific_name})
                  </span>{" "}
                  · confianza {Math.round(identifyResult.confidence * 100)}%
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {identifyResult.reasoning}
                </p>
                {identifyResult.alternatives.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      Alternativas:
                    </span>
                    {identifyResult.alternatives.map((alt) => (
                      <button
                        key={alt.species}
                        type="button"
                        onClick={() => applyAlternative(alt)}
                        className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-accent"
                      >
                        {alt.species} ({Math.round(alt.confidence * 100)}%)
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <input type="hidden" name="photoUrl" value={photoUrl ?? ""} />
      </FormSection>

      <FormSection title="La pieza">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">
              Nombre{" "}
              <span className="font-normal text-muted-foreground">
                (opcional: si lo dejas vacío, se usa la especie)
              </span>
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={item?.name ?? ""}
              placeholder="Tablón de roble del aserradero"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="species-select">Especie</Label>
            <Select
              id="species-select"
              value={customSpecies ? "__custom" : species}
              onChange={(e) => {
                if (e.target.value === "__custom") {
                  setCustomSpecies(true);
                  setSpecies("");
                } else {
                  setCustomSpecies(false);
                  setSpecies(e.target.value);
                }
                setSpeciesConfidence("");
              }}
            >
              <option value="">Sin especificar</option>
              {SPECIES_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="__custom">Otra…</option>
            </Select>
            {customSpecies && (
              <Input
                aria-label="Especie personalizada"
                value={species}
                onChange={(e) => {
                  setSpecies(e.target.value);
                  setSpeciesConfidence("");
                }}
                placeholder="inglés (español), ej. koa"
                autoFocus
              />
            )}
            <input type="hidden" name="species" value={species} />
            <input
              type="hidden"
              name="speciesConfidence"
              value={speciesConfidence}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cutType">Tipo de corte</Label>
            <Select
              id="cutType"
              name="cutType"
              defaultValue={item?.cutType ?? ""}
            >
              <option value="">Sin especificar</option>
              {CUT_TYPES.map((cut) => (
                <option key={cut} value={cut}>
                  {CUT_LABELS[cut]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step="any"
              min="0"
              defaultValue={item?.quantity ?? 1}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unidad</Label>
            <Select id="unit" name="unit" defaultValue={item?.unit ?? "tablones"}>
              {/* Si la pieza trae una unidad antigua fuera de la lista, se
                  conserva como opción para no perderla al editar. */}
              {item?.unit && !UNIT_OPTIONS.includes(item.unit) && (
                <option value={item.unit}>{item.unit}</option>
              )}
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 sm:col-span-2">
            <input
              type="checkbox"
              name="isScrap"
              defaultChecked={item?.isScrap ?? false}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm font-medium">
              Es un scrap{" "}
              <span className="font-normal text-muted-foreground">
                (recorte sobrante de otro proyecto)
              </span>
            </span>
          </label>
        </div>
      </FormSection>

      <FormSection title="Medidas y almacenaje">
        <div className="space-y-2">
          <Label>Dimensiones (pulgadas)</Label>
          <div className="grid grid-cols-3 gap-3">
            <Input
              name="lengthIn"
              placeholder="Largo · 96"
              aria-label="Largo en pulgadas"
              defaultValue={formatInches(item?.lengthIn ?? null) ?? ""}
            />
            <Input
              name="widthIn"
              placeholder="Ancho · 7 1/4"
              aria-label="Ancho en pulgadas"
              defaultValue={formatInches(item?.widthIn ?? null) ?? ""}
            />
            <Input
              name="thicknessIn"
              placeholder="Grosor · 3/4"
              aria-label="Grosor en pulgadas"
              defaultValue={formatInches(item?.thicknessIn ?? null) ?? ""}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Acepta fracciones de carpintero: <code>3/4</code>, <code>1 1/2</code>,{" "}
            <code>48</code>...
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              name="location"
              defaultValue={item?.location ?? ""}
              placeholder="estantería A, bajo el banco..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Etiquetas</Label>
            <Input
              id="tags"
              name="tags"
              defaultValue={item?.tags?.join(", ") ?? ""}
              placeholder="dura, para tallar, restos (separadas por comas)"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Notas">
        <Textarea
          id="notes"
          name="notes"
          defaultValue={item?.notes ?? ""}
          placeholder="Origen, defectos, ideas de uso..."
        />
      </FormSection>

      <div className="flex gap-3 pb-2">
        <Button
          type="submit"
          disabled={isPending || uploading}
          className="h-11 w-full px-6 sm:h-10 sm:w-auto"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
