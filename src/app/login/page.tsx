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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-20 w-20 drop-shadow-md" />
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Woodbase
        </h1>
        <p className="max-w-60 text-sm leading-relaxed text-muted-foreground">
          El inventario de madera de tu taller, con cada pieza en su sitio.
        </p>
      </div>
      <form
        action={login}
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
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
            className="h-10"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">
            Contraseña incorrecta. Inténtalo de nuevo.
          </p>
        )}
        <Button type="submit" className="h-10 w-full">
          Entrar al taller
        </Button>
      </form>
    </main>
  );
}
