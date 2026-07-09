import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

// Inicialización perezosa: evita que `next build` falle cuando DATABASE_URL
// no está definida en el entorno de build.
export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL no está definida");
    }
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

export { schema };
