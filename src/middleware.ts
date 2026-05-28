import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const ADMIN_ROUTES = ["/admin/dashboard", "/admin/products", "/admin/categories", "/admin/brands", "/admin/coupons", "/admin/customers", "/admin/blog", "/admin"];
const WAREHOUSE_ROUTES = ["/admin/stock"];
const SUPPORT_ROUTES = ["/admin/orders"];

type AllowedRole = "ADMIN" | "WAREHOUSE" | "SUPPORT";

const routeAccess: Record<string, AllowedRole[]> = {};

for (const route of ADMIN_ROUTES) {
  routeAccess[route] = ["ADMIN"];
}
for (const route of WAREHOUSE_ROUTES) {
  routeAccess[route] = ["ADMIN", "WAREHOUSE"];
}
for (const route of SUPPORT_ROUTES) {
  routeAccess[route] = ["ADMIN", "SUPPORT"];
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run on admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = (session.user as { role?: string }).role ?? "CUSTOMER";

  // Find the most specific matching route
  const matchedRoute = Object.keys(routeAccess)
    .filter((route) => pathname.startsWith(route))
    .sort((a, b) => b.length - a.length)[0];

  if (matchedRoute) {
    const allowedRoles = routeAccess[matchedRoute];
    if (!allowedRoles.includes(userRole as AllowedRole)) {
      return NextResponse.redirect(new URL("/auth/error?error=AccessDenied", request.url));
    }
  } else if (userRole !== "ADMIN") {
    // Default: any unmatched /admin/* route requires ADMIN role
    return NextResponse.redirect(new URL("/auth/error?error=AccessDenied", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
