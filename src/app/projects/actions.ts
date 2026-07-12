"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projectParts, projects } from "@/lib/db/schema";
import { parseInches } from "@/lib/utils";

const STATUSES = ["idea", "en_curso", "terminado"] as const;
type Status = (typeof STATUSES)[number];

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

function parseProjectForm(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("El proyecto necesita un nombre");
  const statusRaw = str(formData, "status");
  return {
    name,
    description: str(formData, "description"),
    status: STATUSES.includes(statusRaw as Status)
      ? (statusRaw as Status)
      : ("idea" as Status),
    // Portada (screenshot del 3D); se sube antes vía /api/upload.
    photoUrl: str(formData, "photoUrl"),
    notes: str(formData, "notes"),
  };
}

export async function createProject(formData: FormData) {
  const values = parseProjectForm(formData);
  const [project] = await getDb().insert(projects).values(values).returning();
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  const values = parseProjectForm(formData);
  await getDb()
    .update(projects)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(projects.id, id));
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  await getDb().delete(projects).where(eq(projects.id, id));
  revalidatePath("/projects");
  redirect("/projects");
}

export async function addPart(projectId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("La pieza necesita un nombre");
  const quantity = Number(str(formData, "quantity") ?? "1");
  const lengthIn = parseInches(str(formData, "lengthIn"));
  const widthIn = parseInches(str(formData, "widthIn"));
  const thicknessIn = parseInches(str(formData, "thicknessIn"));
  if (lengthIn == null || widthIn == null || thicknessIn == null) {
    throw new Error("La pieza necesita largo, ancho y grosor");
  }
  await getDb().insert(projectParts).values({
    projectId,
    name,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    lengthIn,
    widthIn,
    thicknessIn,
  });
  revalidatePath(`/projects/${projectId}`);
}

export interface ImportedPart {
  name: string;
  quantity: number;
  lengthIn: number;
  widthIn: number;
  thicknessIn: number;
  species: string | null;
}

/** Alta en bloque del despiece revisado del importador STEP. */
export async function importParts(projectId: string, rows: ImportedPart[]) {
  const clean = rows
    .filter(
      (r) =>
        r.name.trim() &&
        [r.lengthIn, r.widthIn, r.thicknessIn].every(
          (v) => Number.isFinite(v) && v > 0,
        ),
    )
    .map((r) => ({
      projectId,
      name: r.name.trim(),
      quantity: Math.max(1, Math.floor(r.quantity)),
      lengthIn: Math.round(r.lengthIn * 32) / 32,
      widthIn: Math.round(r.widthIn * 32) / 32,
      thicknessIn: Math.round(r.thicknessIn * 32) / 32,
      species: r.species?.trim() || null,
    }));
  if (clean.length === 0) throw new Error("No hay piezas válidas que importar");
  await getDb().insert(projectParts).values(clean);
  revalidatePath(`/projects/${projectId}`);
}

/** Guarda qué tablas del inventario se usan en este proyecto (vacío = todas). */
export async function updateProjectBoards(projectId: string, ids: string[]) {
  await getDb()
    .update(projects)
    .set({ boardIds: ids, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  revalidatePath(`/projects/${projectId}`);
}

/** Cambia la especie de una pieza del despiece (selector rápido en línea). */
export async function updatePartSpecies(
  projectId: string,
  partId: string,
  species: string,
) {
  await getDb()
    .update(projectParts)
    .set({ species: species.trim() || null })
    .where(eq(projectParts.id, partId));
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Guarda el estado de la Mesa de trabajo (colocación manual de piezas).
 * No revalida rutas: el cliente es la fuente de verdad mientras se trabaja.
 */
export async function updateWorkbench(projectId: string, layout: unknown) {
  if (typeof layout !== "object" || layout === null) {
    throw new Error("Layout inválido");
  }
  if (JSON.stringify(layout).length > 200_000) {
    throw new Error("La mesa es demasiado grande para guardarse");
  }
  await getDb()
    .update(projects)
    .set({ workbench: layout, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

export async function deletePart(projectId: string, partId: string) {
  await getDb().delete(projectParts).where(eq(projectParts.id, partId));
  revalidatePath(`/projects/${projectId}`);
}

// Nota: el antiguo «Aplicar cortes» (consumir la tabla y crear scraps
// automáticamente) se retiró a propósito: el inventario lo actualiza el
// usuario a mano, con las medidas y fotos reales de sus sobras. El plan de
// corte solo lo sugiere.
