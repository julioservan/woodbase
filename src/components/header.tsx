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
    <header className="sticky top-0 z-10 border-b-2 border-black/50 bg-planks-dark text-walnut-foreground shadow-[0_4px_10px_rgba(30,18,8,0.55),inset_0_1px_0_rgba(255,226,170,0.12),inset_0_-1px_0_rgba(255,226,170,0.08)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.svg"
            alt=""
            className="h-9 w-9 rounded-[9px] shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-black/40 transition-transform group-hover:rotate-6"
          />
          <span className="text-engraved font-display text-xl font-semibold tracking-tight">
            Woodbase
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/items/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#8a5a24] bg-gradient-to-b from-[#f0bd6b] to-[#cf8f33] px-4 text-sm font-semibold text-[#3b2712] [text-shadow:0_1px_0_rgba(255,255,255,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_4px_rgba(0,0,0,0.45)] transition-all hover:from-[#f4c67c] hover:to-[#d6993f] active:shadow-[inset_0_2px_5px_rgba(70,45,15,0.45)]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Añadir pieza</span>
            <span className="sm:hidden">Añadir</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-walnut-foreground/70 transition-colors hover:bg-black/25 hover:text-walnut-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
