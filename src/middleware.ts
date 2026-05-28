import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run on admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Check for session token in cookies (Edge-compatible, no Node deps)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role check is deferred to the page/API level
  // (middleware runs on Edge; full auth requires Node runtime)
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
