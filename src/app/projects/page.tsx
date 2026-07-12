import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { Hammer, Plus } from "lucide-react";
import { getDb } from "@/lib/db";
import { projectParts, projects } from "@/lib/db/schema";
import { Footer } from "@/components/footer";
import { PROJECT_STATUS_LABELS } from "@/lib/utils";
import { Header } from "@/components/header";


export const dynamic = "force-dynamic";

const STATUS_STAMP: Record<string, string> = {
  idea: "border-[#6b6255]/60 text-[#6b6255]/80",
  en_curso: "border-[#a4661f]/65 text-[#a4661f]/85",
  terminado: "border-[#4a7a3a]/65 text-[#4a7a3a]/85",
};

export default async function ProjectsPage() {
  const db = getDb();
  const rows = await db
    .select({
      project: projects,
      partCount: sql<number>`count(${projectParts.id})::int`,
    })
    .from(projects)
    .leftJoin(projectParts, eq(projectParts.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:py-7">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-letterpress font-display text-4xl font-semibold tracking-tight">
            Proyectos
          </h1>
          <Link
            href="/projects/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#8a5a24] bg-gradient-to-b from-[#f0bd6b] to-[#cf8f33] px-4 text-sm font-semibold text-[#3b2712] [text-shadow:0_1px_0_rgba(255,255,255,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_4px_rgba(0,0,0,0.45)] transition-all hover:from-[#f4c67c] hover:to-[#d6993f] active:shadow-[inset_0_2px_5px_rgba(70,45,15,0.45)]"
          >
            <Plus className="h-4 w-4" /> Nuevo proyecto
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="panel-paper flex flex-col items-center gap-3 rounded-2xl py-20 text-center text-muted-foreground">
            <Hammer className="h-10 w-10 opacity-40" />
            <p>Aún no hay proyectos.</p>
            <Link
              href="/projects/new"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Empieza el primero
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ project, partCount }) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="tag-manila group relative space-y-1.5 rounded-lg p-4 pt-5 transition-transform duration-200 before:pointer-events-none before:absolute before:inset-1.5 before:rounded-md before:border before:border-dashed before:border-[#a5865a]/60 before:content-[''] hover:-translate-y-1"
              >
                <span
                  className={`absolute right-3 top-3 rotate-[6deg] rounded-[3px] border-2 px-1.5 py-px text-[10px] font-black uppercase tracking-[0.12em] ${STATUS_STAMP[project.status]}`}
                >
                  {PROJECT_STATUS_LABELS[project.status]}
                </span>
                <h2 className="text-letterpress pr-20 font-display text-xl font-semibold leading-tight">
                  {project.name}
                </h2>
                {project.photoUrl && (
                  <div className="overflow-hidden rounded-md border border-[#a5865a]/40 bg-white/50 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.photoUrl}
                      alt={`Imagen de ${project.name}`}
                      loading="lazy"
                      className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                )}
                {project.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
                <p className="pt-1 text-xs font-medium text-muted-foreground">
                  {partCount} {partCount === 1 ? "pieza" : "piezas"} en el
                  despiece
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
