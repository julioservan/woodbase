import { LogOut } from "lucide-react";
import { logout } from "@/app/auth-actions";

// Pie discreto: cerrar sesión vive aquí en vez de ocupar sitio en el header.
export function Footer() {
  return (
    <footer className="mx-auto flex max-w-5xl items-center justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10">
      <form action={logout}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          <LogOut className="h-3 w-3" /> Salir del taller
        </button>
      </form>
    </footer>
  );
}
