import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ⚠️ ENDPOINT TEMPORAL (bajo la sesión de la app; se elimina tras usarse).
// Añade la columna board_ids a projects.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "0a56ef3c608c6a19baa16849f39c3120";

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
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS board_ids uuid[] DEFAULT '{}' NOT NULL`;
    return NextResponse.json({ ok: true, done: "columna board_ids creada" });
  } catch (error) {
    console.error("Error en setup-board-ids:", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}
