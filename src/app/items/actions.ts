"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { woodItems, type NewWoodItem } from "@/lib/db/schema";
import { CUT_TYPES, parseInches, type CutType } from "@/lib/utils";

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

  const name = str("name");
  if (!name) throw new Error("El nombre es obligatorio");

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
    species: str("species"),
    speciesConfidence: num("speciesConfidence"),
    quantity: num("quantity") ?? 1,
    unit: str("unit") ?? "tablones",
    lengthIn: inches("lengthIn"),
    widthIn: inches("widthIn"),
    thicknessIn: inches("thicknessIn"),
    cutType,
    isScrap: formData.get("isScrap") === "on",
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
