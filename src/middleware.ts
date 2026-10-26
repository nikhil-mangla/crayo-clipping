import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check for NextAuth session cookies (both standard and secure prefixes)
  const token =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value;

  const isLoggedIn = Boolean(token);

  // Protected routes
  const protectedPaths = [
    "/dashboard",
    "/create",
    "/editor",
    "/tools",
    "/projects",
    "/library",
    "/settings",
    "/billing",
    "/admin",
  ];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  // Auth routes (login/register)
  const authPaths = ["/login", "/register"];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|$).*)",
  ],
};
