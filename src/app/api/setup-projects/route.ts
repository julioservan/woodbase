import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ⚠️ ENDPOINT TEMPORAL (bajo la sesión de la app; se elimina tras usarse).
// Crea las tablas de proyectos y despiece.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "c7078e89dbefa54d7fd6099e50d97485";

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
    await sql`DO $$ BEGIN
      CREATE TYPE project_status AS ENUM('idea', 'en_curso', 'terminado');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
    done.push("enum project_status");
    await sql`CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      name text NOT NULL,
      description text,
      status project_status DEFAULT 'idea' NOT NULL,
      notes text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    )`;
    done.push("tabla projects");
    await sql`CREATE TABLE IF NOT EXISTS project_parts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name text NOT NULL,
      quantity real DEFAULT 1 NOT NULL,
      length_in real NOT NULL,
      width_in real NOT NULL,
      thickness_in real NOT NULL,
      notes text,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    )`;
    done.push("tabla project_parts");
    return NextResponse.json({ ok: true, done });
  } catch (error) {
    console.error("Error en setup-projects:", error);
    return NextResponse.json(
      { ok: false, done, error: String(error) },
      { status: 500 },
    );
  }
}
