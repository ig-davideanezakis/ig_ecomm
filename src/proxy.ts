import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes that require authentication
  const protectedPrefixes = ["/admin", "/staff", "/account"];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  // Public auth pages — always allowed
  const authPrefixes = ["/auth/login", "/auth/error", "/auth/verify-2fa"];
  const isAuthPage = authPrefixes.some((p) => pathname.startsWith(p));

  if (!isProtected || isAuthPage) {
    return NextResponse.next();
  }

  // Check for session token in cookies (Edge-compatible — no Node deps)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role & 2FA checks happen in the page/layout components (Node runtime)
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/account/:path*"],
};
