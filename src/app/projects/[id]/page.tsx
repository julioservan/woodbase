import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import {
  ArrowLeft,
  FileText,
  Hammer,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { projectParts, projects, woodItems } from "@/lib/db/schema";
import { addPart, deletePart, deleteProject } from "@/app/projects/actions";
import { Header } from "@/components/header";
import { BoardPicker } from "@/components/board-picker";
import { PartSpeciesSelect } from "@/components/part-species-select";
import { StepImport } from "@/components/step-import";
import { WorkshopAdvice } from "@/components/workshop-advice";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatInches,
  isNonWoodMaterial,
  PROJECT_STATUS_LABELS,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STAMP: Record<string, string> = {
  idea: "border-[#6b6255]/60 text-[#6b6255]/80",
  en_curso: "border-[#a4661f]/65 text-[#a4661f]/85",
  terminado: "border-[#4a7a3a]/65 text-[#4a7a3a]/85",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!project) notFound();

  const parts = await db
    .select()
    .from(projectParts)
    .where(eq(projectParts.projectId, id))
    .orderBy(asc(projectParts.createdAt), asc(projectParts.id));

  const addPartToProject = addPart.bind(null, project.id);
  const deleteThisProject = deleteProject.bind(null, project.id);

  // Especies presentes en el inventario, para el selector rápido de piezas.
  const speciesRows = await db
    .selectDistinct({ species: woodItems.species })
    .from(woodItems)
    .orderBy(woodItems.species);
  const inventorySpecies = speciesRows
    .map((r) => r.species)
    .filter((s): s is string => !!s);

  // Las piezas de otros materiales (metal, herrajes...) no se cortan de
  // tablas: se listan aparte y quedan fuera del plan.
  const nonWoodParts = parts.filter((p) => isNonWoodMaterial(p.species));

  // Inventario completo, para el selector de maderas del proyecto.
  const inventory = await db
    .select()
    .from(woodItems)
    .orderBy(asc(woodItems.createdAt), asc(woodItems.id));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:py-7">
        <Link
          href="/projects"
          className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a proyectos
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-letterpress font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {project.name}
              <span
                className={`ml-3 inline-block -translate-y-1 rotate-[6deg] rounded-[3px] border-2 px-1.5 py-px align-middle font-sans text-[11px] font-black uppercase tracking-[0.12em] ${STATUS_STAMP[project.status]}`}
              >
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
            </h1>
            {project.description && (
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {parts.length > 0 && (
              <a
                href={`/projects/${project.id}/pdf`}
                target="_blank"
                rel="noopener"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#8a5a24] bg-gradient-to-b from-[#f0bd6b] to-[#cf8f33] px-4 text-sm font-semibold text-[#3b2712] [text-shadow:0_1px_0_rgba(255,255,255,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_4px_rgba(0,0,0,0.45)] transition-all hover:from-[#f4c67c] hover:to-[#d6993f] active:shadow-[inset_0_2px_5px_rgba(70,45,15,0.45)]"
              >
                <FileText className="h-3.5 w-3.5" /> PDF del taller
              </a>
            )}
            <Link
              href={`/projects/${project.id}/edit`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#b09468] bg-gradient-to-b from-[#fffdf5] to-[#efe4c9] px-4 text-sm font-semibold text-foreground [text-shadow:0_1px_0_rgba(255,255,255,0.7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(43,30,19,0.3)] transition-all hover:to-[#f6eeda] active:shadow-[inset_0_2px_5px_rgba(90,70,40,0.3)]"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Link>
            <form action={deleteThisProject}>
              <button
                type="submit"
                aria-label="Borrar proyecto"
                title="Borrar proyecto"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#8a3a2c] bg-gradient-to-b from-[#c4573f] to-[#a83c2a] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_2px_rgba(43,30,19,0.3)] transition-all hover:from-[#cd6048] active:shadow-[inset_0_2px_5px_rgba(60,15,8,0.5)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Portada: screenshot del 3D del proyecto */}
        {project.photoUrl && (
          <section className="panel-paper mb-6 overflow-hidden rounded-2xl p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.photoUrl}
              alt={`Imagen de ${project.name}`}
              className="h-auto w-full rounded-xl"
            />
          </section>
        )}

        {/* Despiece */}
        <section className="panel-paper mb-6 rounded-2xl p-4 sm:p-5">
          <h2 className="eyebrow text-letterpress mb-3 text-muted-foreground">
            Despiece
          </h2>
          {parts.length > 0 && (
            <ul className="mb-4 divide-y divide-[#c9b28c]/60">
              {parts.map((part) => {
                const removePart = deletePart.bind(null, project.id, part.id);
                return (
                  <li
                    key={part.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {Math.floor(part.quantity)} × {part.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {formatInches(part.lengthIn)}″ ×{" "}
                          {formatInches(part.widthIn)}″ ×{" "}
                          {formatInches(part.thicknessIn)}″
                        </p>
                        <PartSpeciesSelect
                          projectId={project.id}
                          partId={part.id}
                          species={part.species}
                          inventorySpecies={inventorySpecies}
                        />
                      </div>
                    </div>
                    <form action={removePart}>
                      <button
                        type="submit"
                        aria-label={`Quitar ${part.name}`}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Añadir pieza al despiece */}
          <form
            action={addPartToProject}
            className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_4.5rem_5.5rem_5.5rem_5.5rem_auto]"
          >
            <Input
              name="name"
              required
              placeholder="Pieza (pata, tapa...)"
              aria-label="Nombre de la pieza"
              className="col-span-2 sm:col-span-1"
            />
            <Input
              name="quantity"
              type="number"
              min="1"
              step="1"
              defaultValue="1"
              aria-label="Cantidad"
            />
            <Input name="lengthIn" required placeholder="Largo″" aria-label="Largo en pulgadas" />
            <Input name="widthIn" required placeholder="Ancho″" aria-label="Ancho en pulgadas" />
            <Input name="thicknessIn" required placeholder="Grosor″" aria-label="Grosor en pulgadas" />
            <Button type="submit" size="sm" className="col-span-2 h-10 rounded-lg sm:col-span-1 sm:h-9">
              <Plus className="h-4 w-4" /> Añadir
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Medidas en pulgadas; acepta fracciones (<code>3/4</code>,{" "}
            <code>1 1/2</code>...).
          </p>

          <div className="mt-4 border-t border-[#c9b28c]/60 pt-4">
            <StepImport projectId={project.id} />
          </div>
        </section>

        {/* Optimizador */}
        {parts.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-letterpress font-display text-2xl font-semibold tracking-tight">
                Plan de corte
              </h2>
              <Link
                href={`/projects/${project.id}/mesa`}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#8a5a24] bg-gradient-to-b from-[#f0bd6b] to-[#cf8f33] px-4 text-sm font-semibold text-[#3b2712] [text-shadow:0_1px_0_rgba(255,255,255,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_4px_rgba(0,0,0,0.45)] transition-all hover:from-[#f4c67c] hover:to-[#d6993f] active:shadow-[inset_0_2px_5px_rgba(70,45,15,0.45)]"
              >
                <Hammer className="h-4 w-4" /> Mesa de trabajo
              </Link>
            </div>

            <BoardPicker
              projectId={project.id}
              boards={inventory.map((i) => ({
                id: i.id,
                name: i.name,
                species: i.species,
                lengthIn: i.lengthIn,
                widthIn: i.widthIn,
                thicknessIn: i.thicknessIn,
                quantity: i.quantity,
                unit: i.unit,
                isScrap: i.isScrap,
                photoUrl: i.photoUrl,
              }))}
              selected={project.boardIds}
            />

            {nonWoodParts.length > 0 && (
              <p className="rounded-xl border border-[#6b6255]/30 bg-[#6b6255]/10 px-4 py-2.5 text-xs text-[#5a5245]">
                Fuera del plan de corte (otros materiales):{" "}
                {nonWoodParts
                  .map(
                    (p) =>
                      `${Math.floor(p.quantity)} × ${p.name} (${p.species})`,
                  )
                  .join(" · ")}
              </p>
            )}

            <WorkshopAdvice
              projectId={project.id}
              parts={parts.map((p) => ({ id: p.id, name: p.name }))}
            />
          </section>
        )}

        {project.notes && (
          <section className="panel-paper mt-6 rounded-2xl p-4">
            <h2 className="eyebrow mb-1.5 text-muted-foreground">Notas</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {project.notes}
            </p>
          </section>
        )}
      </main>
    </>
  );
}
