import { NextResponse, type NextRequest } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;

  if (await isValidSession(cookie)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Protege toda la app salvo /login, assets estáticos, favicon y
  // /api/upload (recibe el callback server-to-server de Vercel Blob; la
  // autorización se valida dentro de la propia ruta).
  matcher: [
    "/((?!login|api/upload|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
