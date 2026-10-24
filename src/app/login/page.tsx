import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE, sessionToken } from "@/lib/auth";
import { sendLoginCode } from "@/lib/email";
import {
  isAllowedEmail,
  issueLoginCode,
  normalizeEmail,
  verifyLoginCode,
} from "@/lib/login-codes";
import { safeNext } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

// Email al que se acaba de mandar el código, para no tener que reescribirlo
// en el segundo paso.
const PENDING_EMAIL_COOKIE = "woodbase_login_email";

function loginUrl(params: Record<string, string>) {
  return `/login?${new URLSearchParams(params).toString()}`;
}

async function requestCode(formData: FormData) {
  "use server";
  const next = safeNext(formData.get("next"));
  const raw = formData.get("email");
  if (typeof raw !== "string" || !raw.includes("@")) {
    redirect(loginUrl({ error: "email", next }));
  }
  const email = normalizeEmail(raw);

  // A un email no autorizado no se le manda nada, pero la respuesta es la
  // misma: así el login no revela qué emails pueden entrar.
  let notice = "sent";
  if (isAllowedEmail(email)) {
    const result = await issueLoginCode(email);
    if (result.status === "too_soon") {
      notice = "wait";
    } else {
      try {
        await sendLoginCode(email, result.code);
      } catch (err) {
        console.error("No se pudo enviar el código", err);
        redirect(loginUrl({ error: "send", next }));
      }
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/login",
    maxAge: 60 * 15,
  });
  redirect(loginUrl({ step: "code", notice, next }));
}

async function verifyCode(formData: FormData) {
  "use server";
  const next = safeNext(formData.get("next"));
  const code = formData.get("code");
  const cookieStore = await cookies();
  const email = cookieStore.get(PENDING_EMAIL_COOKIE)?.value;
  if (!email) redirect(loginUrl({ next }));

  if (typeof code !== "string" || !(await verifyLoginCode(email, code))) {
    redirect(loginUrl({ step: "code", error: "code", next }));
  }

  cookieStore.delete({ name: PENDING_EMAIL_COOKIE, path: "/login" });
  cookieStore.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 días
  });
  redirect(next);
}

const ERRORS: Record<string, string> = {
  email: "Escribe un email válido.",
  send: "No se pudo enviar el código. Inténtalo de nuevo en un momento.",
  code: "Código incorrecto o caducado. Revísalo o pide otro.",
};

const NOTICES: Record<string, string> = {
  wait: "Ya te enviamos un código hace menos de un minuto: usa ese o espera para pedir otro.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    step?: string;
    next?: string;
  }>;
}) {
  const { error, notice, step, next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  const cookieStore = await cookies();
  if (await isValidSession(cookieStore.get(SESSION_COOKIE)?.value)) {
    redirect(next);
  }
  const pendingEmail = cookieStore.get(PENDING_EMAIL_COOKIE)?.value;
  const codeStep = step === "code" && !!pendingEmail;

  const labelClass =
    "text-engraved text-sm font-semibold text-walnut-foreground";
  const hintClass =
    "text-sm leading-relaxed text-walnut-foreground/75 [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]";
  const linkClass =
    "text-sm text-walnut-foreground/60 underline-offset-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] hover:text-walnut-foreground hover:underline";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-9 bg-planks-dark p-6 text-walnut-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.svg"
          alt=""
          className="h-24 w-24 rounded-[22px] shadow-[0_10px_20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-black/50"
        />
        <div className="space-y-1.5">
          <h1 className="text-engraved font-display text-5xl font-semibold tracking-tight">
            Woodbase
          </h1>
          <p className="mx-auto max-w-64 text-sm leading-relaxed text-walnut-foreground/60 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
            El inventario de madera de tu taller, con cada pieza en su sitio.
          </p>
        </div>
      </div>
      {/* Tarjeta de cuero cosido */}
      <form
        action={codeStep ? verifyCode : requestCode}
        className="relative w-full max-w-sm space-y-4 rounded-2xl border border-[#241507] bg-gradient-to-b from-[#7a5233] to-[#573921] p-7 shadow-[0_20px_36px_-12px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,222,170,0.3)] texture-paper"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2.5 rounded-xl border-2 border-dashed border-[#e8cfa4]/35"
        />
        <input type="hidden" name="next" value={next} />
        {codeStep ? (
          <div className="relative space-y-2">
            <label htmlFor="code" className={labelClass}>
              Código de 6 cifras
            </label>
            <p className={hintClass}>
              Si <strong className="break-all">{pendingEmail}</strong> puede
              entrar, te acaba de llegar un email con el código.
            </p>
            <Input
              id="code"
              name="code"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              placeholder="123456"
              className="relative h-11 border-[#33200e] text-center text-xl tracking-[0.4em] sm:text-xl"
            />
          </div>
        ) : (
          <div className="relative space-y-2">
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              defaultValue={pendingEmail}
              placeholder="tu@email.com"
              className="relative h-11 border-[#33200e]"
            />
          </div>
        )}
        {error && ERRORS[error] && (
          <p className="relative text-sm font-medium text-[#ffc9b3] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">
            {ERRORS[error]}
          </p>
        )}
        {codeStep && notice && NOTICES[notice] && (
          <p className="relative text-sm font-medium text-[#ffe2a8] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">
            {NOTICES[notice]}
          </p>
        )}
        <Button type="submit" className="relative h-11 w-full text-[15px]">
          {codeStep ? "Entrar al taller" : "Enviarme un código"}
        </Button>
      </form>
      {codeStep && (
        <div className="-mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <form action={requestCode}>
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="email" value={pendingEmail} />
            <button type="submit" className={linkClass}>
              Reenviar código
            </button>
          </form>
          <Link href={loginUrl({ next })} className={linkClass}>
            Usar otro email
          </Link>
        </div>
      )}
      <Link href={next} className={linkClass}>
        Volver sin entrar
      </Link>
    </main>
  );
}
