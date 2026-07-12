"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { Project } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_STATUS_LABELS } from "@/lib/utils";

export function ProjectForm({
  project,
  action,
  submitLabel,
}: {
  project?: Project;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  // Portada: p. ej. un screenshot del 3D de Shapr3D.
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    project?.photoUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir la imagen");
      setPhotoUrl(data.url);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Error al subir la imagen",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form
      action={(formData) => startTransition(() => action(formData))}
      className="space-y-5"
    >
      <section className="panel-paper space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={project?.name ?? ""}
            placeholder="Mesita de centro"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              id="status"
              name="status"
              defaultValue={project?.status ?? "idea"}
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              name="description"
              defaultValue={project?.description ?? ""}
              placeholder="Para el salón, estilo nórdico..."
            />
          </div>
        </div>

        {/* Portada del proyecto */}
        <div className="space-y-2">
          <Label htmlFor="project-photo">Imagen (screenshot del 3D)</Label>
          <input type="hidden" name="photoUrl" value={photoUrl ?? ""} />
          {photoUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-border/70 bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="Imagen del proyecto"
                className="max-h-64 w-full object-contain"
              />
              <button
                type="button"
                aria-label="Quitar imagen"
                onClick={() => setPhotoUrl(null)}
                className="absolute right-2 top-2 rounded-md border border-border bg-card/90 p-1.5 text-muted-foreground shadow-sm hover:text-[#a4372a]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#c9b28c] text-sm text-muted-foreground transition-colors hover:border-[#a5865a] hover:text-foreground disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ImagePlus className="h-5 w-5" />
              )}
              {uploading ? "Subiendo…" : "Subir screenshot del proyecto"}
            </button>
          )}
          <input
            ref={fileRef}
            id="project-photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {uploadError && (
            <p className="text-xs text-destructive">{uploadError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={project?.notes ?? ""}
            placeholder="Ideas, acabados, referencias..."
          />
        </div>
      </section>

      <div className="sticky bottom-0 z-30 -mx-4 bg-gradient-to-t from-background from-60% via-background/90 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6">
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
