export const SESSION_COOKIE = "woodbase_session";

// El valor de la cookie de sesión es un HMAC-SHA256 derivado de APP_PASSWORD.
// Al derivarse de la variable de entorno, cambiar la contraseña invalida
// todas las sesiones. Usa Web Crypto para funcionar también en middleware
// (runtime edge).
export async function sessionToken(): Promise<string> {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    throw new Error("APP_PASSWORD no está definida");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
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
  if (!cookieValue) return false;
  try {
    return cookieValue === (await sessionToken());
  } catch {
    return false;
  }
}
