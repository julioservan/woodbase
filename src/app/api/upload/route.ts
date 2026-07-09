import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

// Subida directa navegador → Vercel Blob. El navegador pide un token a esta
// ruta y sube el archivo directo al store, sin pasar el archivo por la
// función serverless (evita el límite de 4,5 MB de Vercel). El token
// BLOB_READ_WRITE_TOKEN nunca llega al cliente.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // La ruta está exenta del middleware, así que validamos la sesión
        // aquí (esta parte solo se ejecuta para la petición del navegador,
        // no para el callback de Vercel).
        const cookieStore = await cookies();
        if (!(await isValidSession(cookieStore.get(SESSION_COOKIE)?.value))) {
          throw new Error("No autorizado");
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
          ],
          maximumSizeInBytes: 15 * 1024 * 1024, // 15 MB
          addRandomSuffix: true,
        };
      },
      // Vercel llama a este callback (server-to-server) al terminar la subida.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir" },
      { status: 400 },
    );
  }
}
