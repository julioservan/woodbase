import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE, sessionToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  const password = formData.get("password");
  if (
    typeof password !== "string" ||
    !process.env.APP_PASSWORD ||
    password !== process.env.APP_PASSWORD
  ) {
    redirect("/login?error=1");
  }
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 días
  });
  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  if (await isValidSession(cookieStore.get(SESSION_COOKIE)?.value)) {
    redirect("/");
  }
  const { error } = await searchParams;

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
        action={login}
        className="relative w-full max-w-sm space-y-4 rounded-2xl border border-[#241507] bg-gradient-to-b from-[#7a5233] to-[#573921] p-7 shadow-[0_20px_36px_-12px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,222,170,0.3)] texture-paper"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2.5 rounded-xl border-2 border-dashed border-[#e8cfa4]/35"
        />
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-engraved text-sm font-semibold text-walnut-foreground"
          >
            Contraseña
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            placeholder="••••••••"
            className="relative h-11 border-[#33200e]"
          />
        </div>
        {error && (
          <p className="text-sm font-medium text-[#ffc9b3] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">
            Contraseña incorrecta. Inténtalo de nuevo.
          </p>
        )}
        <Button
          type="submit"
          className="relative h-11 w-full text-[15px]"
        >
          Entrar al taller
        </Button>
      </form>
    </main>
  );
}
