"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { Project } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  en_curso: "En curso",
  terminado: "Terminado",
};

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
          disabled={isPending}
          className="h-11 w-full px-6 sm:h-10 sm:w-auto"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
