import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Protected routes
  const protectedPaths = ["/dashboard", "/create", "/editor", "/tools", "/projects", "/library", "/settings", "/billing", "/admin"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  // Auth routes (login/register)
  const authPaths = ["/login", "/register"];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|$).*)",
  ],
};
