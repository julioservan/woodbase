import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ⚠️ ENDPOINT TEMPORAL (bajo la sesión de la app; se elimina tras usarse).
// Inserta el panel de contrachapado lijado de forma idempotente.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "9c2ca2e2002c4087d92e1894b505a36f";
const NAME = "Sanded Plywood Project Panel";

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
    const exists =
      await sql`SELECT 1 FROM wood_items WHERE name = ${NAME} LIMIT 1`;
    if (exists.length > 0) {
      return NextResponse.json({ ok: true, done: `ya existía: ${NAME}` });
    }
    await sql`
      INSERT INTO wood_items
        (name, species, quantity, unit, length_in, width_in, thickness_in, cut_type, notes)
      VALUES
        (${NAME}, NULL, 1, 'paneles', 48, 24, 0.71875, 'plywood'::cut_type,
         'Home Depot · 23/32 in × 2 ft × 4 ft')
    `;
    return NextResponse.json({ ok: true, done: `insertada: ${NAME}` });
  } catch (error) {
    console.error("Error en add-sanded-plywood:", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}
