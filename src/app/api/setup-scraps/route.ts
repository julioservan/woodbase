import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ⚠️ ENDPOINT TEMPORAL (bajo la sesión de la app; se elimina tras usarse).
// Añade la columna is_scrap y limpia la etiqueta redundante "live edge".

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "db8324e230e3102409abe9439c9ef0ae";

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
    await sql`ALTER TABLE wood_items ADD COLUMN IF NOT EXISTS is_scrap boolean DEFAULT false NOT NULL`;
    await sql`UPDATE wood_items SET tags = array_remove(tags, 'live edge')`;
    return NextResponse.json({
      ok: true,
      done: ["columna is_scrap creada", "etiqueta 'live edge' retirada"],
    });
  } catch (error) {
    console.error("Error en setup-scraps:", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}
