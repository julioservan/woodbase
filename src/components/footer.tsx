import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { logout } from "@/app/auth-actions";
import { canEdit } from "@/lib/session";

// Pie discreto: entrar / salir vive aquí en vez de ocupar sitio en el header.
// Sin sesión la app es de solo lectura; entrar desbloquea la edición.
export async function Footer() {
  const editable = await canEdit();
  const linkClass =
    "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline";
  return (
    <footer className="mx-auto flex max-w-5xl items-center justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10">
      {editable ? (
        <form action={logout}>
          <button type="submit" className={linkClass}>
            <LogOut className="h-3 w-3" /> Salir del taller
          </button>
        </form>
      ) : (
        <Link href="/login" className={linkClass}>
          <LogIn className="h-3 w-3" /> Entrar para editar
        </Link>
      )}
    </footer>
  );
}
