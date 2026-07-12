import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projectParts, projects, woodItems } from "@/lib/db/schema";
import { expandBoards } from "@/lib/optimizer";
import { buildMesaSurfaces } from "@/lib/workbench";
import { buildCutListPdf } from "@/lib/pdf/cutlist";
import { isNonWoodMaterial } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PDF del taller: cut list + el plan de corte REAL de la Mesa de trabajo
// (el usuario coloca los cortes a mano; aquí no se autocoloca nada).
// Protegido por la sesión de la app vía middleware, como el resto.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!project) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 },
    );
  }

  const parts = await db
    .select()
    .from(projectParts)
    .where(eq(projectParts.projectId, id))
    .orderBy(asc(projectParts.createdAt), asc(projectParts.id));

  // Las superficies de la mesa referencian unidades de TODO el inventario
  // (por si la selección de maderas cambió después de montar la mesa).
  const inventory = await db
    .select()
    .from(woodItems)
    .orderBy(asc(woodItems.createdAt), asc(woodItems.id));
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
  const { surfaces, unplaced } = buildMesaSurfaces(
    project.workbench,
    expandBoards(inventory),
    woodParts,
  );

  const pdf = await buildCutListPdf(project, parts, surfaces, unplaced);
  const filename = `${project.name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "proyecto"} - cut list.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
