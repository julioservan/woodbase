import {
  boolean,
  jsonb,
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
  // Retal/scrap: recorte sobrante de otro proyecto.
  isScrap: boolean("is_scrap").notNull().default(false),
  // Talla visual (s/m/l/xl): cómo de grande se dibuja en la estantería.
  displaySize: text("display_size").notNull().default("xl"),
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

// ---------- Proyectos (v2) ----------

export const projectStatusEnum = pgEnum("project_status", [
  "idea",
  "en_curso",
  "terminado",
]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("idea"),
  // Tablas del inventario elegidas para este proyecto; vacío = todas.
  boardIds: uuid("board_ids").array().notNull().default([]),
  // Estado de la Mesa de trabajo (colocación manual de piezas sobre tablas).
  workbench: jsonb("workbench"),
  // Portada del proyecto: p. ej. un screenshot del 3D de Shapr3D.
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Despiece: las piezas que necesita un proyecto, en pulgadas.
export const projectParts = pgTable("project_parts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: real("quantity").notNull().default(1),
  lengthIn: real("length_in").notNull(),
  widthIn: real("width_in").notNull(),
  thicknessIn: real("thickness_in").notNull(),
  species: text("species"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type ProjectPart = typeof projectParts.$inferSelect;
