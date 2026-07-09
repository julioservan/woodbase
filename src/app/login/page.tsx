import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isValidSession, SESSION_COOKIE, sessionToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

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
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-12 w-12" />
            <h1 className="text-xl font-semibold">Woodbase</h1>
            <p className="text-sm text-muted-foreground">
              El inventario de madera de tu taller
            </p>
          </div>
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoFocus
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">
                Contraseña incorrecta. Inténtalo de nuevo.
              </p>
            )}
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
