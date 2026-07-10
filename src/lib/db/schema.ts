import {
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// El schema está preparado para crecer: en v2 se añadirán tablas como
// `projects` (proyectos de carpintería) y `tools` (herramientas), que podrán
// referenciar wood_items.id como fk.

export const cutTypeEnum = pgEnum("cut_type", [
  "lumber",
  "live_edge",
  "cookie",
  "torneado",
  "chapa",
  "plywood",
]);

export const woodItems = pgTable("wood_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  species: text("species"),
  speciesConfidence: real("species_confidence"),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit").notNull().default("tablones"),
  // Dimensiones en pulgadas decimales; se muestran y se introducen como
  // fracciones de carpintero (ej. 1 3/4″) — ver parseInches/formatInches.
  lengthIn: real("length_in"),
  widthIn: real("width_in"),
  thicknessIn: real("thickness_in"),
  cutType: cutTypeEnum("cut_type"),
  location: text("location"),
  tags: text("tags").array().notNull().default([]),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WoodItem = typeof woodItems.$inferSelect;
export type NewWoodItem = typeof woodItems.$inferInsert;
