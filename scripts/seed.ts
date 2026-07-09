import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { woodItems } from "../src/lib/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Define DATABASE_URL en .env antes de ejecutar el seed");
  }
  const db = drizzle(neon(url));

  const existing = await db.select({ id: woodItems.id }).from(woodItems).limit(1);
  if (existing.length > 0) {
    console.log("La tabla wood_items ya tiene datos; no se insertan ejemplos.");
    return;
  }

  await db.insert(woodItems).values([
    {
      name: "Tablones de roble del aserradero",
      species: "roble",
      quantity: 4,
      unit: "tablones",
      lengthMm: 2000,
      widthMm: 200,
      thicknessMm: 27,
      moistureState: "seco",
      location: "estantería A",
      tags: ["dura", "muebles"],
      notes:
        "Comprados en el aserradero de la comarca. Buen veteado, un nudo grande en uno de ellos.",
    },
    {
      name: "Trozo de nogal para tallar",
      species: "nogal",
      speciesConfidence: 0.85,
      quantity: 1,
      unit: "piezas",
      lengthMm: 400,
      widthMm: 150,
      thicknessMm: 80,
      moistureState: "secando",
      location: "bajo el banco",
      tags: ["dura", "para tallar"],
      notes: "De un árbol caído del vecino. Dejar secar hasta el invierno.",
    },
    {
      name: "Listones de pino",
      species: "pino",
      quantity: 12,
      unit: "metros lineales",
      lengthMm: 2400,
      widthMm: 45,
      thicknessMm: 20,
      moistureState: "seco",
      location: "estantería B",
      tags: ["blanda", "estructura"],
      notes: "Para bastidores y prototipos.",
    },
    {
      name: "Restos de haya",
      species: "haya",
      quantity: 6,
      unit: "piezas",
      moistureState: "seco",
      location: "caja de restos",
      tags: ["dura", "restos"],
      notes: "Recortes de un proyecto anterior. Útiles para plantillas y cuñas.",
    },
  ]);

  console.log("Seed completado: 4 piezas de ejemplo insertadas.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
