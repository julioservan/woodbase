import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ⚠️ ENDPOINT TEMPORAL de migración (se elimina tras ejecutarse una vez).
// Añade el valor 'plywood' al enum e inserta las piezas pendientes de forma
// idempotente (comprueba por nombre antes de insertar).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "46a6d983ec20da2466948c4814a18031";

const ITEMS = [
  {
    name: "Ash Micro Lumber",
    species: "fresno",
    unit: "tablones",
    lengthIn: 31,
    widthIn: 7.1875,
    thicknessIn: 0.625,
    cutType: "lumber",
    notes: "SKU W253199",
  },
  {
    name: "Extra Fancy Siberian Elm Burl Live Edge Lumber",
    species: "olmo siberiano",
    unit: "tablones",
    lengthIn: 24.375,
    widthIn: 10.6875,
    thicknessIn: 1,
    cutType: "live_edge",
    notes: "SKU W252465",
  },
  {
    name: "Extra Fancy Claro Walnut Live Edge Lumber",
    species: "nogal claro",
    unit: "tablones",
    lengthIn: 20.8125,
    widthIn: 13.375,
    thicknessIn: 1,
    cutType: "live_edge",
    notes: "SKU W246545",
  },
  {
    name: "Extra Fancy Olive Live Edge Lumber",
    species: "olivo",
    unit: "tablones",
    lengthIn: 18,
    widthIn: 11.1875,
    thicknessIn: 1.0625,
    cutType: "live_edge",
    notes: "SKU W252509",
  },
  {
    name: "Eastern Walnut Cookie",
    species: "nogal",
    unit: "piezas",
    lengthIn: 27.75,
    widthIn: 10,
    thicknessIn: 1,
    cutType: "cookie",
    notes: "SKU W228508",
  },
  {
    name: "Sande Plywood Project Panel",
    species: "sande",
    unit: "paneles",
    lengthIn: 48,
    widthIn: 24,
    thicknessIn: 0.25,
    cutType: "plywood",
    notes: "Home Depot · $16.43",
  },
];

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
    await sql`ALTER TYPE cut_type ADD VALUE IF NOT EXISTS 'plywood'`;
    done.push("enum: plywood disponible");

    for (const it of ITEMS) {
      const exists =
        await sql`SELECT 1 FROM wood_items WHERE name = ${it.name} LIMIT 1`;
      if (exists.length > 0) {
        done.push(`ya existía: ${it.name}`);
        continue;
      }
      await sql`
        INSERT INTO wood_items
          (name, species, quantity, unit, length_in, width_in, thickness_in, cut_type, notes)
        VALUES
          (${it.name}, ${it.species}, 1, ${it.unit}, ${it.lengthIn},
           ${it.widthIn}, ${it.thicknessIn}, ${it.cutType}::cut_type, ${it.notes})
      `;
      done.push(`insertada: ${it.name}`);
    }
    return NextResponse.json({ ok: true, done });
  } catch (error) {
    console.error("Error en setup-plywood:", error);
    return NextResponse.json(
      { ok: false, done, error: String(error) },
      { status: 500 },
    );
  }
}
