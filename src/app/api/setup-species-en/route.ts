import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ⚠️ ENDPOINT TEMPORAL (bajo la sesión de la app; se elimina tras usarse).
// Convierte las especies al formato "inglés (español)"; si el nombre es
// igual en ambos idiomas, se deja una sola vez.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "19913ea803b4c115a0a8c44957305f73";

const RENAMES: Record<string, string> = {
  sapeli: "sapele (sapeli)",
  arce: "maple (arce)",
  amaranto: "purpleheart (amaranto)",
  fresno: "ash (fresno)",
  "olmo siberiano": "siberian elm (olmo siberiano)",
  "nogal claro": "claro walnut (nogal claro)",
  olivo: "olive (olivo)",
  nogal: "walnut (nogal)",
  // sucupira, narra, granadillo, mango y sande se llaman igual en ambos.
};

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
  const done: string[] = [];
  try {
    for (const [from, to] of Object.entries(RENAMES)) {
      const rows =
        await sql`UPDATE wood_items SET species = ${to} WHERE species = ${from} RETURNING name`;
      if (rows.length > 0) {
        done.push(`${from} → ${to} (${rows.length})`);
      }
    }
    return NextResponse.json({ ok: true, done });
  } catch (error) {
    console.error("Error en setup-species-en:", error);
    return NextResponse.json(
      { ok: false, done, error: String(error) },
      { status: 500 },
    );
  }
}
