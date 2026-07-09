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
      name: "Sucupira Live Edge",
      species: "sucupira",
      quantity: 1,
      unit: "tablones",
      lengthIn: 28.9375,
      widthIn: 10.75,
      thicknessIn: 1.4375,
      cutType: "live_edge",
      tags: ["live edge"],
    },
    {
      name: "Sapele",
      species: "sapeli",
      quantity: 1,
      unit: "tablones",
      lengthIn: 23.1875,
      widthIn: 8.5,
      thicknessIn: 1.6875,
      cutType: "lumber",
    },
    {
      name: "Extra Fancy Curly Narra Live Edge",
      species: "narra",
      quantity: 1,
      unit: "tablones",
      lengthIn: 14.625,
      widthIn: 7.625,
      thicknessIn: 0.75,
      cutType: "live_edge",
      tags: ["live edge", "rizada"],
    },
    {
      name: "Extra Fancy Maple Live Edge",
      species: "arce",
      quantity: 1,
      unit: "tablones",
      lengthIn: 24.125,
      widthIn: 13.875,
      thicknessIn: 0.9375,
      cutType: "live_edge",
      tags: ["live edge"],
    },
    {
      name: "Granadillo Turning Square",
      species: "granadillo",
      quantity: 2,
      unit: "piezas",
      lengthIn: 12,
      widthIn: 1.5,
      thicknessIn: 1.5,
      cutType: "torneado",
    },
    {
      name: "Purpleheart Turning Square",
      species: "amaranto",
      quantity: 4,
      unit: "piezas",
      lengthIn: 18,
      widthIn: 1.5,
      thicknessIn: 1.5,
      cutType: "torneado",
    },
    {
      name: "Mango Lumber (Squared)",
      species: "mango",
      quantity: 10,
      unit: "pies tablares",
      thicknessIn: 1.25,
      cutType: "lumber",
      notes: "10 BF (medidas variables).",
    },
    {
      name: "Mango Lumber (Live Edge)",
      species: "mango",
      quantity: 1,
      unit: "pies tablares",
      thicknessIn: 1.25,
      cutType: "live_edge",
      notes: "1 BF (medidas variables).",
    },
  ]);

  console.log("Seed completado: inventario inicial insertado.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
