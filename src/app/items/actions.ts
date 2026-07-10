"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { woodItems, type NewWoodItem } from "@/lib/db/schema";
import {
  CUT_TYPES,
  DISPLAY_SIZES,
  parseInches,
  type CutType,
  type DisplaySize,
} from "@/lib/utils";

function parseItemForm(formData: FormData): Omit<NewWoodItem, "id"> {
  const str = (key: string): string | null => {
    const v = formData.get(key);
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  };
  const num = (key: string): number | null => {
    const v = str(key);
    if (v == null) return null;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const inches = (key: string): number | null => parseInches(str(key));

  const species = str("species");
  // El nombre es opcional: sin nombre, la pieza se llama como su especie.
  const rawName = str("name");
  const name =
    rawName ??
    (species ? species.charAt(0).toUpperCase() + species.slice(1) : null);
  if (!name) throw new Error("Pon un nombre o al menos la especie");

  const cutRaw = str("cutType");
  const cutType = CUT_TYPES.includes(cutRaw as CutType)
    ? (cutRaw as CutType)
    : null;

  const tags = (str("tags") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  return {
    name,
    species,
    speciesConfidence: num("speciesConfidence"),
    quantity: num("quantity") ?? 1,
    unit: str("unit") ?? "tablones",
    lengthIn: inches("lengthIn"),
    widthIn: inches("widthIn"),
    thicknessIn: inches("thicknessIn"),
    cutType,
    isScrap: formData.get("isScrap") === "on",
    displaySize: DISPLAY_SIZES.includes(str("displaySize") as DisplaySize)
      ? (str("displaySize") as DisplaySize)
      : "xl",
    location: str("location"),
    tags: Array.from(new Set(tags)),
    photoUrl: str("photoUrl"),
    notes: str("notes"),
  };
}

export async function createItem(formData: FormData) {
  const values = parseItemForm(formData);
  const [item] = await getDb().insert(woodItems).values(values).returning();
  revalidatePath("/");
  redirect(`/items/${item.id}`);
}

export async function updateItem(id: string, formData: FormData) {
  const values = parseItemForm(formData);
  await getDb()
    .update(woodItems)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(woodItems.id, id));
  revalidatePath("/");
  revalidatePath(`/items/${id}`);
  redirect(`/items/${id}`);
}

export async function deleteItem(id: string) {
  await getDb().delete(woodItems).where(eq(woodItems.id, id));
  revalidatePath("/");
  redirect("/");
}
