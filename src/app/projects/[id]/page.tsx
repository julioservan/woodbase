import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, Axe, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { projectParts, projects, woodItems } from "@/lib/db/schema";
import { addPart, deletePart, deleteProject } from "@/app/projects/actions";
import { Header } from "@/components/header";
import { BoardPicker } from "@/components/board-picker";
import { CutDiagram } from "@/components/cut-diagram";
import { PartSpeciesSelect } from "@/components/part-species-select";
import { StepImport } from "@/components/step-import";
import { WorkshopAdvice } from "@/components/workshop-advice";
import { PROJECT_STATUS_LABELS } from "@/components/project-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  expandBoards,
  expandParts,
  optimize,
  planGlueUps,
  unplacedReason,
  type BoardUnit,
  type GlueNote,
} from "@/lib/optimizer";
import { boardFeet, formatInches, isNonWoodMaterial } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STAMP: Record<string, string> = {
  idea: "border-[#6b6255]/60 text-[#6b6255]/80",
  en_curso: "border-[#a4661f]/65 text-[#a4661f]/85",
  terminado: "border-[#4a7a3a]/65 text-[#4a7a3a]/85",
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ optimizar?: string }>;
}) {
  const { id } = await params;
  const { optimizar } = await searchParams;
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
  const woodParts = parts.filter((p) => !isNonWoodMaterial(p.species));
  const nonWoodParts = parts.filter((p) => isNonWoodMaterial(p.species));

  // Inventario completo (para el selector de maderas) y el subconjunto
  // elegido para este proyecto (vacío = todas).
  const inventory = await db
    .select()
    .from(woodItems)
    .orderBy(asc(woodItems.createdAt), asc(woodItems.id));
  const boardFilterActive = project.boardIds.length > 0;
  const usableInventory = boardFilterActive
    ? inventory.filter((i) => project.boardIds.includes(i.id))
    : inventory;

  // El optimizador solo corre cuando se pide (?optimizar=1).
  let result = null;
  let boards: BoardUnit[] = [];
  let glueNotes: GlueNote[] = [];
  if (optimizar && woodParts.length > 0) {
    boards = expandBoards(usableInventory);
    // Piezas que no caben enteras → tiras/capas encolables.
    const prepared = planGlueUps(expandParts(woodParts), boards);
    glueNotes = prepared.notes;
    result = optimize(prepared.instances, boards);
  }

  // Lista de la compra: piezas sin sitio agrupadas, con el motivo real.
  const shopping =
    result && result.unplaced.length > 0
      ? [
          ...result.unplaced
            .reduce((map, p) => {
              const key = `${p.name}|${p.species ?? ""}`;
              const entry = map.get(key) ?? {
                name: p.name,
                species: p.species,
                count: 0,
                bf: 0,
                reason: unplacedReason(p, boards),
              };
              entry.count += 1;
              entry.bf += boardFeet(p.lengthIn, p.widthIn, p.thicknessIn) ?? 0;
              map.set(key, entry);
              return map;
            }, new Map<string, { name: string; species: string | null; count: number; bf: number; reason: string }>())
            .values(),
        ]
      : [];

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
              {!result && (
                <Link
                  href={`/projects/${project.id}?optimizar=1`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#8a5a24] bg-gradient-to-b from-[#f0bd6b] to-[#cf8f33] px-4 text-sm font-semibold text-[#3b2712] [text-shadow:0_1px_0_rgba(255,255,255,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_4px_rgba(0,0,0,0.45)] transition-all hover:from-[#f4c67c] hover:to-[#d6993f] active:shadow-[inset_0_2px_5px_rgba(70,45,15,0.45)]"
                >
                  <Axe className="h-4 w-4" /> Optimizar cortes
                </Link>
              )}
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
              }))}
              selected={project.boardIds}
            />

            {result && nonWoodParts.length > 0 && (
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

            {/* Veredicto: ¿hay madera suficiente en el inventario? */}
            {result && result.unplaced.length === 0 && (
              <p className="rounded-xl border border-[#4a7a3a]/40 bg-[#4a7a3a]/10 px-4 py-2.5 text-sm font-medium text-[#3d6530]">
                ✓ Tienes madera suficiente: todo el despiece sale de tu
                inventario con {result.plans.length}{" "}
                {result.plans.length === 1 ? "tabla" : "tablas"}
                {glueNotes.length > 0 &&
                  ` y ${glueNotes.reduce((s, n) => s + n.count, 0)} ${
                    glueNotes.reduce((s, n) => s + n.count, 0) === 1
                      ? "encolado"
                      : "encolados"
                  }`}
                .
              </p>
            )}

            {/* Encolados: cómo juntar tiras/capas para las piezas grandes */}
            {glueNotes.length > 0 && (
              <div className="rounded-xl border border-[#8a5a24]/40 bg-amber/15 px-4 py-3 text-sm text-[#5c3c14]">
                <p className="mb-1.5 font-semibold">
                  Encolados necesarios (las tiras/capas ya están en los
                  planos):
                </p>
                <ul className="space-y-0.5">
                  {glueNotes.map((n, i) => (
                    <li key={i} className="tabular-nums">
                      {n.count > 1 ? `${n.count} × ` : ""}
                      {n.partName}:{" "}
                      {n.axis === "ancho"
                        ? `encolar ${n.pieces} tiras de ${formatInches(n.pieceDim)}″ de ancho para llegar a ${formatInches(n.targetDim)}″`
                        : `laminar ${n.pieces} capas de ${formatInches(n.pieceDim)}″ de grosor para llegar a ${formatInches(n.targetDim)}″`}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs opacity-80">
                  Demasía incluida: 1/8″ por tira para cantear y 1/16″ por capa
                  para cepillar tras el encolado.
                </p>
              </div>
            )}
            {shopping.length > 0 && (
              <div className="rounded-xl border border-[#a83c2a]/40 bg-[#a83c2a]/10 px-4 py-3 text-sm text-[#7c2d20]">
                <p className="mb-1.5 font-semibold">
                  Te falta madera
                  {boardFilterActive && " (solo con las maderas elegidas)"} —
                  lista de la compra:
                </p>
                <ul className="space-y-1">
                  {shopping.map((s, i) => (
                    <li key={i} className="tabular-nums">
                      {s.count} × {s.name}
                      {s.species ? ` · ${s.species}` : " · cualquier madera"}
                      {s.bf > 0 && ` · ~${s.bf.toFixed(2)} BF`}
                      <span className="block text-xs font-normal opacity-80">
                        → {s.reason}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs opacity-80">
                  Compra con demasía: el BF indicado es neto de pieza, sin
                  desperdicio de corte.
                </p>
              </div>
            )}
            {result && result.plans.length === 0 && result.unplaced.length === 0 && (
              <p className="panel-paper rounded-2xl p-4 text-sm text-muted-foreground">
                Ninguna tabla del inventario puede con estas piezas (revisa
                grosores y medidas).
              </p>
            )}

            {result?.plans.map((plan) => (
              <article
                key={plan.board.key}
                className="panel-paper space-y-3 rounded-2xl p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-letterpress text-lg font-semibold">
                    {plan.board.name}
                    {plan.board.unitIndex > 0 &&
                      ` (unidad ${plan.board.unitIndex + 1})`}
                  </h3>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatInches(plan.board.lengthIn)}″ ×{" "}
                    {formatInches(plan.board.widthIn)}″ ×{" "}
                    {formatInches(plan.board.thicknessIn)}″ · aprovechas el{" "}
                    {Math.round(plan.utilization * 100)}%
                  </p>
                </div>
                <CutDiagram plan={plan} />
                <div className="space-y-1 text-xs text-muted-foreground">
                  {plan.placements.some((p) => p.needsPlaning) && (
                    <p>
                      ⚠ Algunas piezas necesitan cepillado: la tabla es más
                      gruesa que la pieza.
                    </p>
                  )}
                  <p>Kerf de sierra de 1/8″ descontado · veta a lo largo.</p>
                  {/* Sugerencia manual: la app no toca el inventario sola */}
                  <p className="pt-1">
                    Cuando lo cortes, acuérdate de actualizar el inventario a
                    mano: descuenta «{plan.board.name}»
                    {plan.leftovers.length > 0 &&
                      ` y da de alta las sobras aprovechables (según el plano: ${plan.leftovers
                        .map(
                          (s) =>
                            `${formatInches(s.lengthIn)}″ × ${formatInches(s.widthIn)}″`,
                        )
                        .join(", ")}) con sus medidas y fotos reales`}
                    .
                  </p>
                </div>
              </article>
            ))}

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
