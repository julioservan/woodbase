import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/lib/db";
import { projectParts, projects, woodItems } from "@/lib/db/schema";
import { Header } from "@/components/header";
import { Workbench } from "@/components/workbench";
import { expandBoards } from "@/lib/optimizer";
import { isNonWoodMaterial } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Mesa de trabajo: planificación manual de cortes sobre las tablas a escala.
export default async function WorkbenchPage({
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

  const inventory = await db
    .select()
    .from(woodItems)
    .orderBy(asc(woodItems.createdAt), asc(woodItems.id));
  const usable =
    project.boardIds.length > 0
      ? inventory.filter((i) => project.boardIds.includes(i.id))
      : inventory;

  const boardUnits = expandBoards(usable);
  const boardPhotos = Object.fromEntries(
    usable.map((i) => [i.id, i.photoUrl]),
  );

  const woodParts = parts
    .filter((p) => !isNonWoodMaterial(p.species))
    .map((p) => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      lengthIn: p.lengthIn,
      widthIn: p.widthIn,
      thicknessIn: p.thicknessIn,
      species: p.species,
    }));

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:py-7">
        <Link
          href={`/projects/${project.id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a {project.name}
        </Link>
        <h1 className="text-letterpress font-display text-3xl font-semibold leading-tight tracking-tight">
          Mesa de trabajo
        </h1>
        <p className="mb-5 mt-1 max-w-2xl text-sm text-muted-foreground">
          Tus tablas a escala real. Añade tablas, toca una pieza y suéltala
          donde la cortarías: la mesa imanta los bordes (respetando la sierra),
          te da las medidas de corte y avisa de veta, especie y grosor.
        </p>
        {woodParts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#c9b28c] p-6 text-sm text-muted-foreground">
            El proyecto aún no tiene despiece de madera: añade piezas primero.
          </p>
        ) : (
          <Workbench
            projectId={project.id}
            boardUnits={boardUnits}
            boardPhotos={boardPhotos}
            parts={woodParts}
            initialLayout={project.workbench}
          />
        )}
      </main>
    </div>
  );
}
