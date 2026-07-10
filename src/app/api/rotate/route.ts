import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";

export const runtime = "nodejs";

// Igual que en /api/upload: solo se usa BLOB_READ_WRITE_TOKEN si parece un
// token válido; dentro de Vercel el SDK se autentica vía OIDC.
function blobToken() {
  const raw = process.env.BLOB_READ_WRITE_TOKEN ?? "";
  return raw.match(/vercel_blob_rw_[A-Za-z0-9_]+/)?.[0];
}

// Gira 90° en sentido horario la foto indicada y la guarda como blob nuevo.
// No borra el anterior: la pieza sigue apuntando a él hasta que se guarde.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const photoUrl = body?.photoUrl;
  if (typeof photoUrl !== "string" || !photoUrl) {
    return NextResponse.json({ error: "Falta photoUrl" }, { status: 400 });
  }
  if (!/\.blob\.vercel-storage\.com\//.test(photoUrl)) {
    return NextResponse.json(
      { error: "Solo se pueden rotar fotos subidas a la app" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(photoUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: "No se pudo descargar la foto" },
        { status: 400 },
      );
    }
    const isPng = (res.headers.get("content-type") ?? "").includes("png");
    const original = Buffer.from(await res.arrayBuffer());
    const pipeline = sharp(original).rotate(90);
    const rotated = isPng
      ? await pipeline.png().toBuffer()
      : await pipeline.jpeg({ quality: 92 }).toBuffer();

    const blob = await put(
      `wood/${crypto.randomUUID()}.${isPng ? "png" : "jpg"}`,
      rotated,
      {
        access: "public",
        contentType: isPng ? "image/png" : "image/jpeg",
        token: blobToken(),
      },
    );
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Error al rotar la foto:", error);
    return NextResponse.json(
      { error: "No se pudo rotar la foto" },
      { status: 500 },
    );
  }
}
