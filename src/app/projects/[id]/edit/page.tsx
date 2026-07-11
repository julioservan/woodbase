import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { updateProject } from "@/app/projects/actions";
import { Header } from "@/components/header";
import { ProjectForm } from "@/components/project-form";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project] = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!project) notFound();

  const updateThisProject = updateProject.bind(null, project.id);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Link
          href={`/projects/${project.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al proyecto
        </Link>
        <h1 className="text-letterpress mb-6 font-display text-2xl font-semibold tracking-tight">
          Editar «{project.name}»
        </h1>
        <ProjectForm
          project={project}
          action={updateThisProject}
          submitLabel="Guardar cambios"
        />
      </main>
    </>
  );
}
