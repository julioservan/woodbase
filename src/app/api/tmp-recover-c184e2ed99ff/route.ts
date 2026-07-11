import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { asc, ilike, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { woodItems } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint TEMPORAL de inspección (protegido por sesión, ruta aleatoria):
// muestra el estado de todo lo relacionado con Mango y las fotos de Blob que
// ya no referencia ningún item, para reconstruir la tabla borrada por el
// antiguo «Aplicar cortes». Se elimina tras usarse.

function blobToken() {
  const raw = process.env.BLOB_READ_WRITE_TOKEN ?? "";
  return raw.match(/vercel_blob_rw_[A-Za-z0-9_]+/)?.[0];
}

export async function GET() {
  const db = getDb();

  const mango = await db
    .select()
    .from(woodItems)
    .where(
      or(ilike(woodItems.species, "%mango%"), ilike(woodItems.name, "%mango%")),
    )
    .orderBy(asc(woodItems.createdAt));

  const all = await db.select({ photoUrl: woodItems.photoUrl }).from(woodItems);
  const referenced = new Set(all.map((i) => i.photoUrl).filter(Boolean));

  let orphanBlobs: { url: string; uploadedAt: string; size: number }[] = [];
  let blobError: string | null = null;
  try {
    const { blobs } = await list({ prefix: "wood/", token: blobToken() });
    orphanBlobs = blobs
      .filter((b) => !referenced.has(b.url))
      .map((b) => ({
        url: b.url,
        uploadedAt: new Date(b.uploadedAt).toISOString(),
        size: b.size,
      }))
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
  } catch (error) {
    blobError = String(error);
  }

  const report = {
    mango_items: mango.map((i) => ({
      id: i.id,
      name: i.name,
      species: i.species,
      quantity: i.quantity,
      unit: i.unit,
      lengthIn: i.lengthIn,
      widthIn: i.widthIn,
      thicknessIn: i.thicknessIn,
      cutType: i.cutType,
      isScrap: i.isScrap,
      displaySize: i.displaySize,
      location: i.location,
      photoUrl: i.photoUrl,
      notes: i.notes,
      createdAt: i.createdAt.toISOString(),
    })),
    orphan_blobs: orphanBlobs,
    blob_error: blobError,
  };

  // Los logs de Vercel truncan líneas largas: una línea por elemento.
  for (const item of report.mango_items) {
    console.log("TMP-RECOVER-ITEM", JSON.stringify(item));
  }
  for (const blob of orphanBlobs) {
    console.log("TMP-RECOVER-ORPHAN", JSON.stringify(blob));
  }
  console.log(
    "TMP-RECOVER-SUMMARY",
    JSON.stringify({
      items: report.mango_items.length,
      orphans: orphanBlobs.length,
      blob_error: blobError,
    }),
  );
  return NextResponse.json(report);
}
