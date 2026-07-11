import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-black/50 bg-planks-dark pt-[env(safe-area-inset-top)] text-walnut-foreground shadow-[0_4px_10px_rgba(30,18,8,0.55),inset_0_1px_0_rgba(255,226,170,0.12),inset_0_-1px_0_rgba(255,226,170,0.08)]">
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
        <nav className="flex items-center gap-4 text-sm font-medium sm:gap-5">
          <Link
            href="/"
            className="text-engraved text-walnut-foreground/80 transition-colors hover:text-walnut-foreground"
          >
            Inventario
          </Link>
          <Link
            href="/projects"
            className="text-engraved text-walnut-foreground/80 transition-colors hover:text-walnut-foreground"
          >
            Proyectos
          </Link>
        </nav>
      </div>
    </header>
  );
}
