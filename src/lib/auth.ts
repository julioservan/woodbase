export const SESSION_COOKIE = "woodbase_session";

// Interruptor temporal: con `true` no se pide código para nada, todo se puede
// ver y editar sin entrar. Está así mientras en Vercel no existan
// ALLOWED_EMAILS y RESEND_API_KEY (sin ellas el código por email no puede
// llegar). Para volver a exigir el código, ponlo a `false` y despliega.
export const AUTH_DISABLED = true;

// Secreto con el que se firman la sesión y los códigos de acceso.
// AUTH_SECRET; si no está, se reutiliza APP_PASSWORD (de cuando se entraba
// con contraseña) para que las sesiones abiertas sigan valiendo.
export function authSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.APP_PASSWORD;
  if (!secret) {
    throw new Error("AUTH_SECRET no está definida");
  }
  return secret;
}

// El valor de la cookie de sesión es un HMAC-SHA256 derivado del secreto.
// Cambiar el secreto invalida todas las sesiones. Usa Web Crypto para
// funcionar también en middleware (runtime edge).
export async function sessionToken(): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("woodbase-session-v1"),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidSession(
  cookieValue: string | undefined,
): Promise<boolean> {
  if (AUTH_DISABLED) return true;
  if (!cookieValue) return false;
  try {
    return cookieValue === (await sessionToken());
  } catch {
    return false;
  }
}
