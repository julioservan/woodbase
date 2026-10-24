import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";

// ¿Ha entrado con la contraseña? Las páginas lo usan para mostrar u ocultar
// los controles de edición; quien bloquea de verdad es el middleware.
export async function canEdit(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSession(cookieStore.get(SESSION_COOKIE)?.value);
}

// Destino tras el login: solo rutas internas (nada de //otro-dominio).
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/";
}
