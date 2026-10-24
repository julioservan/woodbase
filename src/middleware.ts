import { NextResponse, type NextRequest } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";

// Woodbase se puede ver sin contraseña; modificar exige sesión.
// Toda escritura llega por POST (server actions y /api/*), así que basta con
// cerrar cualquier método que no sea de lectura, más las páginas que solo
// sirven para editar.
const EDIT_PAGES = [
  /^\/items\/new\/?$/,
  /^\/items\/[^/]+\/edit\/?$/,
  /^\/projects\/new\/?$/,
  /^\/projects\/[^/]+\/edit\/?$/,
  /^\/projects\/[^/]+\/mesa\/?$/,
];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isRead = request.method === "GET" || request.method === "HEAD";
  const needsSession =
    !isRead ||
    pathname.startsWith("/api") ||
    EDIT_PAGES.some((re) => re.test(pathname));

  if (!needsSession) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSession(cookie)) {
    return NextResponse.next();
  }

  if (!isRead || pathname.startsWith("/api")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Todo pasa por aquí salvo /login, assets estáticos y favicon.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
