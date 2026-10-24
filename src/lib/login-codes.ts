import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { loginCodes } from "@/lib/db/schema";
import { authSecret } from "@/lib/auth";

// Acceso por código de email: se pide el código, llega un número de 6
// cifras y se escribe en el login. Solo pueden entrar los emails de
// ALLOWED_EMAILS (separados por comas).

const CODE_TTL_MS = 10 * 60 * 1000; // el código vale 10 minutos
const RESEND_AFTER_MS = 60 * 1000; // y no se reenvía más de uno por minuto
const MAX_ATTEMPTS = 5; // tras 5 fallos hay que pedir otro

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmail(email: string): boolean {
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
  return allowed.includes(normalizeEmail(email));
}

function hashCode(email: string, code: string): string {
  return createHmac("sha256", authSecret())
    .update(`woodbase-login-code-v1:${email}:${code}`)
    .digest("hex");
}

// La tabla se crea sola la primera vez (misma idea que las migraciones
// 0007/0008): así no hay que lanzar `db:migrate` a mano en producción.
let tableReady: Promise<unknown> | null = null;
function ensureTable() {
  tableReady ??= getDb().execute(sql`
    CREATE TABLE IF NOT EXISTS "login_codes" (
      "email" text PRIMARY KEY NOT NULL,
      "code_hash" text NOT NULL,
      "expires_at" timestamp with time zone NOT NULL,
      "attempts" integer DEFAULT 0 NOT NULL,
      "sent_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  return tableReady;
}

export type IssueResult =
  | { status: "issued"; code: string }
  | { status: "too_soon" };

// Genera y guarda un código nuevo (sustituye al anterior).
export async function issueLoginCode(rawEmail: string): Promise<IssueResult> {
  const email = normalizeEmail(rawEmail);
  await ensureTable();
  const db = getDb();
  const [existing] = await db
    .select({ sentAt: loginCodes.sentAt })
    .from(loginCodes)
    .where(eq(loginCodes.email, email));
  if (existing && Date.now() - existing.sentAt.getTime() < RESEND_AFTER_MS) {
    return { status: "too_soon" };
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const row = {
    codeHash: hashCode(email, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
    attempts: 0,
    sentAt: new Date(),
  };
  await db
    .insert(loginCodes)
    .values({ email, ...row })
    .onConflictDoUpdate({ target: loginCodes.email, set: row });
  return { status: "issued", code };
}

// Comprueba el código. Un acierto lo consume; cada fallo cuenta un intento.
export async function verifyLoginCode(
  rawEmail: string,
  rawCode: string,
): Promise<boolean> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  if (!isAllowedEmail(email) || code.length !== 6) return false;

  await ensureTable();
  const db = getDb();
  // Se cuenta el intento antes de comparar: así no se pueden lanzar muchos
  // intentos en paralelo contra el mismo código.
  const [row] = await db
    .update(loginCodes)
    .set({ attempts: sql`${loginCodes.attempts} + 1` })
    .where(eq(loginCodes.email, email))
    .returning();
  if (!row) return false;
  if (row.attempts > MAX_ATTEMPTS || row.expiresAt.getTime() < Date.now()) {
    return false;
  }

  const expected = Buffer.from(row.codeHash, "hex");
  const given = Buffer.from(hashCode(email, code), "hex");
  if (!timingSafeEqual(expected, given)) return false;

  await db.delete(loginCodes).where(eq(loginCodes.email, email));
  return true;
}
