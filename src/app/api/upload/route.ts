import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Sube la foto a Vercel Blob desde el servidor: el token
// BLOB_READ_WRITE_TOKEN nunca llega al cliente.
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
      { error: "La imagen supera el máximo de 10 MB" },
      { status: 400 },
    );
  }

  const extension = file.name.split(".").pop() || "jpg";
  const blob = await put(`wood/${crypto.randomUUID()}.${extension}`, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
