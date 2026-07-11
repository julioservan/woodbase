"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projectParts, projects, woodItems } from "@/lib/db/schema";
import { parseInches } from "@/lib/utils";
import { expandBoards, expandParts, optimize } from "@/lib/optimizer";

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

export async function deletePart(projectId: string, partId: string) {
  await getDb().delete(projectParts).where(eq(projectParts.id, partId));
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Aplica los cortes planificados de UNA tabla: la consume del inventario
 * (resta una unidad o borra la pieza) y da de alta las sobras como scraps.
 * El plan se recalcula aquí: el optimizador es determinista, así que coincide
 * con lo que se mostró en pantalla.
 */
export async function applyCuts(
  projectId: string,
  boardKey: string,
): Promise<void> {
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) throw new Error("Proyecto no encontrado");

  const parts = await db
    .select()
    .from(projectParts)
    .where(eq(projectParts.projectId, projectId))
    .orderBy(asc(projectParts.createdAt), asc(projectParts.id));
  const inventory = await db
    .select()
    .from(woodItems)
    .orderBy(asc(woodItems.createdAt), asc(woodItems.id));

  const result = optimize(expandParts(parts), expandBoards(inventory));
  const plan = result.plans.find((p) => p.board.key === boardKey);
  if (!plan) throw new Error("Ese plan de corte ya no es válido");

  const [item] = await db
    .select()
    .from(woodItems)
    .where(eq(woodItems.id, plan.board.itemId))
    .limit(1);
  if (!item) throw new Error("La tabla ya no está en el inventario");

  // Consume una unidad de la tabla.
  if (item.quantity > 1) {
    await db
      .update(woodItems)
      .set({ quantity: item.quantity - 1, updatedAt: new Date() })
      .where(eq(woodItems.id, item.id));
  } else {
    await db.delete(woodItems).where(eq(woodItems.id, item.id));
  }

  // Alta de las sobras aprovechables como scraps.
  for (const leftover of plan.leftovers) {
    await db.insert(woodItems).values({
      name: `Sobra de ${item.name}`,
      species: item.species,
      quantity: 1,
      unit: "piezas",
      lengthIn: Math.round(leftover.lengthIn * 16) / 16,
      widthIn: Math.round(leftover.widthIn * 16) / 16,
      thicknessIn: item.thicknessIn,
      cutType: item.cutType,
      isScrap: true,
      displaySize: "s",
      location: item.location,
      notes: `Sobra de los cortes del proyecto «${project.name}»`,
    });
  }

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?optimizar=1&aplicado=1`);
}
