import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ⚠️ ENDPOINT TEMPORAL (bajo la sesión de la app; se elimina tras usarse).
// Añade la columna species al despiece.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "af708e6a82ba2cc0ec0fac383b044a28";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: "Sin DATABASE_URL" }, { status: 500 });
  }
  const sql = neon(dbUrl);
  try {
    await sql`ALTER TABLE project_parts ADD COLUMN IF NOT EXISTS species text`;
    return NextResponse.json({ ok: true, done: "columna species creada" });
  } catch (error) {
    console.error("Error en setup-part-species:", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}
