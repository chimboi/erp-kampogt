import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_VALUE } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const authed = request.cookies.get(SESSION_COOKIE)?.value === SESSION_VALUE;
  const { pathname } = request.nextUrl;
  if (pathname === "/entrar") {
    return authed
      ? NextResponse.redirect(new URL("/inicio", request.url))
      : NextResponse.next();
  }
  if (!authed) return NextResponse.redirect(new URL("/entrar", request.url));
  if (pathname === "/")
    return NextResponse.redirect(new URL("/inicio", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|favicon.svg|apple-icon.png|logo.png).*)",
  ],
};
