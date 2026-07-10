import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

// La foto va cliente → esta función → Vercel Blob. En Vercel el SDK v2 se
// autentica solo vía OIDC + BLOB_STORE_ID (los inyecta la plataforma), así
// que solo usamos BLOB_READ_WRITE_TOKEN si contiene un token con pinta de
// válido; un valor corrupto (pegado a mano con saltos de línea) se ignora.
function blobToken() {
  const raw = process.env.BLOB_READ_WRITE_TOKEN ?? "";
  return raw.match(/vercel_blob_rw_[A-Za-z0-9_]+/)?.[0];
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Falta el archivo 'file'" },
      { status: 400 },
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Solo se permiten imágenes" },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "La imagen supera el máximo de 8 MB" },
      { status: 400 },
    );
  }

  const extFromType = file.type.split("/")[1]?.replace("jpeg", "jpg");
  const ext = (extFromType || "jpg").replace(/[^a-z0-9]/g, "");

  try {
    const blob = await put(`wood/${crypto.randomUUID()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
      token: blobToken(),
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Error al subir a Blob:", error);
    return NextResponse.json(
      { error: "No se pudo subir la foto" },
      { status: 500 },
    );
  }
}
