import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";

async function logout() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

export function Header() {
  return (
    <header className="sticky top-0 z-10 bg-walnut text-walnut-foreground shadow-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.svg"
            alt=""
            className="h-8 w-8 transition-transform group-hover:rotate-6"
          />
          <span className="font-display text-xl font-semibold tracking-tight">
            Woodbase
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/items/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-amber px-4 text-sm font-semibold text-amber-foreground shadow-sm transition-all hover:brightness-105 hover:shadow"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Añadir pieza</span>
            <span className="sm:hidden">Añadir</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-walnut-foreground/70 transition-colors hover:bg-white/10 hover:text-walnut-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
