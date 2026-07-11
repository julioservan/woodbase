import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { ProjectForm } from "@/components/project-form";
import { createProject } from "@/app/projects/actions";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Link
          href="/projects"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a proyectos
        </Link>
        <h1 className="text-letterpress mb-6 font-display text-2xl font-semibold tracking-tight">
          Nuevo proyecto
        </h1>
        <ProjectForm action={createProject} submitLabel="Crear proyecto" />
      </main>
    </>
  );
}
