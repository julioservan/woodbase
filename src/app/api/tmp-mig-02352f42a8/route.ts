import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Migración TEMPORAL (protegida por sesión, ruta aleatoria): añade la columna
// jsonb `workbench` a projects para la Mesa de trabajo. Se elimina tras usarse.
export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ error: "Sin DATABASE_URL" }, { status: 500 });
  }
  try {
    const sql = neon(url);
    await sql.query(
      'ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "workbench" jsonb',
    );
    console.log("TMP-MIG workbench OK");
    return NextResponse.json({ ok: true, added: "projects.workbench" });
  } catch (error) {
    console.error("TMP-MIG workbench ERROR", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
