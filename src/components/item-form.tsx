"use client";

import { useState, useTransition } from "react";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import type { WoodItem } from "@/lib/db/schema";
import { formatInches } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface IdentifyResult {
  species: string;
  scientific_name: string;
  confidence: number;
  alternatives: { species: string; confidence: number }[];
  reasoning: string;
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
  const [speciesConfidence, setSpeciesConfidence] = useState<string>(
    item?.speciesConfidence != null ? String(item.speciesConfidence) : "",
  );
  const [identifying, setIdentifying] = useState(false);
  const [identifyResult, setIdentifyResult] = useState<IdentifyResult | null>(
    null,
  );
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
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
    setSpeciesConfidence(alt.confidence.toFixed(2));
  }

  return (
    <form
      action={(formData) => startTransition(() => action(formData))}
      className="space-y-6"
    >
      {/* Foto */}
      <div className="space-y-2">
        <Label>Foto</Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="relative aspect-square w-full max-w-56 overflow-hidden rounded-lg border border-border bg-muted">
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
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  aria-label="Quitar foto"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-accent">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-6 w-6" />
                    <span className="px-4 text-center text-xs">
                      Toca para hacer una foto o subir una imagen
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleIdentify}
              disabled={!photoUrl || identifying || uploading}
            >
              {identifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {identifying ? "Identificando..." : "Identificar especie con IA"}
            </Button>
            <p className="text-xs text-muted-foreground">
              La IA analiza la foto y sugiere la especie. Es una estimación
              orientativa: revísala y corrígela si hace falta antes de guardar.
            </p>
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
            {identifyError && (
              <p className="text-sm text-destructive">{identifyError}</p>
            )}
            {identifyResult && (
              <Card className="bg-accent/50">
                <CardContent className="space-y-2 p-3 text-sm">
                  <p>
                    <span className="font-medium">
                      {identifyResult.species}
                    </span>{" "}
                    <span className="italic text-muted-foreground">
                      ({identifyResult.scientific_name})
                    </span>{" "}
                    · confianza {Math.round(identifyResult.confidence * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                          className="rounded-full border border-border bg-card px-2 py-0.5 text-xs hover:bg-accent"
                        >
                          {alt.species} ({Math.round(alt.confidence * 100)}%)
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <input type="hidden" name="photoUrl" value={photoUrl ?? ""} />
      </div>

      {/* Datos básicos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={item?.name ?? ""}
            placeholder="Tablón de roble del aserradero"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="species">Especie</Label>
          <Input
            id="species"
            name="species"
            value={species}
            onChange={(e) => {
              setSpecies(e.target.value);
              setSpeciesConfidence("");
            }}
            placeholder="roble, nogal, pino..."
          />
          <input
            type="hidden"
            name="speciesConfidence"
            value={speciesConfidence}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="moistureState">Estado de humedad</Label>
          <Select
            id="moistureState"
            name="moistureState"
            defaultValue={item?.moistureState ?? ""}
          >
            <option value="">Sin especificar</option>
            <option value="verde">Verde</option>
            <option value="secando">Secando</option>
            <option value="seco">Seco</option>
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
          <Input
            id="unit"
            name="unit"
            defaultValue={item?.unit ?? "tablones"}
            placeholder="tablones, piezas, m², metros lineales"
            list="unit-suggestions"
          />
          <datalist id="unit-suggestions">
            <option value="tablones" />
            <option value="piezas" />
            <option value="m²" />
            <option value="metros lineales" />
          </datalist>
        </div>
      </div>

      {/* Dimensiones */}
      <div className="space-y-2">
        <Label>Dimensiones (pulgadas)</Label>
        <div className="grid grid-cols-3 gap-3">
          <Input
            name="lengthIn"
            placeholder={'Largo · 96'}
            aria-label="Largo en pulgadas"
            defaultValue={formatInches(item?.lengthIn ?? null) ?? ""}
          />
          <Input
            name="widthIn"
            placeholder={'Ancho · 7 1/4'}
            aria-label="Ancho en pulgadas"
            defaultValue={formatInches(item?.widthIn ?? null) ?? ""}
          />
          <Input
            name="thicknessIn"
            placeholder={'Grosor · 3/4'}
            aria-label="Grosor en pulgadas"
            defaultValue={formatInches(item?.thicknessIn ?? null) ?? ""}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Acepta fracciones de carpintero: <code>3/4</code>,{" "}
          <code>1 1/2</code>, <code>48</code>...
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

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={item?.notes ?? ""}
          placeholder="Origen, defectos, ideas de uso..."
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending || uploading}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
