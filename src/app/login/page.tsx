import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE, sessionToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-9 bg-walnut p-6 text-walnut-foreground texture-wood">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.svg"
          alt=""
          className="h-24 w-24 rounded-[22px] shadow-warm-lg ring-1 ring-amber/30"
        />
        <div className="space-y-1.5">
          <h1 className="font-display text-5xl font-semibold tracking-tight">
            Woodbase
          </h1>
          <p className="mx-auto max-w-64 text-sm leading-relaxed text-walnut-foreground/60">
            El inventario de madera de tu taller, con cada pieza en su sitio.
          </p>
        </div>
      </div>
      <form
        action={login}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-amber/20 bg-card p-6 text-foreground shadow-warm-lg"
      >
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            placeholder="••••••••"
            className="h-11"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">
            Contraseña incorrecta. Inténtalo de nuevo.
          </p>
        )}
        <Button type="submit" className="h-11 w-full rounded-full text-[15px]">
          Entrar al taller
        </Button>
      </form>
    </main>
  );
}
