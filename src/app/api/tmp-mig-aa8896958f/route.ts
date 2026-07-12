import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Migración TEMPORAL (protegida por sesión, ruta aleatoria): añade la columna
// photo_url a projects para la portada del proyecto. Se elimina tras usarse.
export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ error: "Sin DATABASE_URL" }, { status: 500 });
  }
  try {
    const sql = neon(url);
    await sql.query(
      'ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "photo_url" text',
    );
    console.log("TMP-MIG project photo OK");
    return NextResponse.json({ ok: true, added: "projects.photo_url" });
  } catch (error) {
    console.error("TMP-MIG project photo ERROR", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
