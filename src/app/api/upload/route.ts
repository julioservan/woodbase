import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Subida directa navegador → Vercel Blob. El navegador pide un token a esta
// ruta y sube el archivo directo al store, sin pasar el archivo por la
// función serverless (evita el límite de 4,5 MB de Vercel). El token
// BLOB_READ_WRITE_TOKEN nunca llega al cliente.
export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json(
      { error: "Recarga la página e inténtalo de nuevo" },
      { status: 400 },
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      // Genera el token de subida directa. No validamos la sesión aquí
      // porque la librería de Blob pide el token sin enviar la cookie
      // httpOnly. Riesgo acotado: solo imágenes, 15 MB máx., rutas con
      // sufijo aleatorio, y toda la app va detrás de APP_PASSWORD.
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ],
        maximumSizeInBytes: 15 * 1024 * 1024, // 15 MB
        addRandomSuffix: true,
      }),
      // Vercel llama a este callback (server-to-server) al terminar la subida.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Error en /api/upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir" },
      { status: 400 },
    );
  }
}
