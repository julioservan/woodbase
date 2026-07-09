import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";
import { Button } from "@/components/ui/button";

async function logout() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">
            Woodbase
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/items/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Añadir pieza</span>
            <span className="sm:hidden">Añadir</span>
          </Link>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
