import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ⚠️ ENDPOINT TEMPORAL (bajo la sesión de la app; se elimina tras usarse).
// Añade la columna display_size (talla visual s/m/l/xl).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "c3cf5eb43a40a122b892a12ab662c21b";

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
    await sql`ALTER TABLE wood_items ADD COLUMN IF NOT EXISTS display_size text DEFAULT 'xl' NOT NULL`;
    return NextResponse.json({ ok: true, done: "columna display_size creada" });
  } catch (error) {
    console.error("Error en setup-display-size:", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}
