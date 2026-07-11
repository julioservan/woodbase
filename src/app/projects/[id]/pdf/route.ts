import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projectParts, projects, woodItems } from "@/lib/db/schema";
import {
  expandBoards,
  expandParts,
  optimize,
  planGlueUps,
  type GlueNote,
} from "@/lib/optimizer";
import { buildCutListPdf } from "@/lib/pdf/cutlist";
import { isNonWoodMaterial } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PDF del taller: cut list + planos de corte del proyecto. Protegido por la
// sesión de la app vía middleware, como el resto de páginas.
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

  let plans: ReturnType<typeof optimize>["plans"] = [];
  let unplacedNames: string[] = [];
  let glueNotes: GlueNote[] = [];
  if (parts.length > 0) {
    const inventoryAll = await db
      .select()
      .from(woodItems)
      .orderBy(asc(woodItems.createdAt), asc(woodItems.id));
    const inventory =
      project.boardIds.length > 0
        ? inventoryAll.filter((i) => project.boardIds.includes(i.id))
        : inventoryAll;
    const boards = expandBoards(inventory);
    const woodParts = parts.filter((p) => !isNonWoodMaterial(p.species));
    const prepared = planGlueUps(expandParts(woodParts), boards);
    glueNotes = prepared.notes;
    const result = optimize(prepared.instances, boards);
    plans = result.plans;
    unplacedNames = [...new Set(result.unplaced.map((p) => p.name))];
  }

  const pdf = await buildCutListPdf(
    project,
    parts,
    plans,
    unplacedNames,
    glueNotes,
  );
  const filename = `${project.name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "proyecto"} - cut list.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
