import { NextResponse, type NextRequest } from "next/server";

import { decodeSession } from "@/lib/auth/cookie";

function isLockedAdminPath(pathname: string): boolean {
  // Must not use startsWith("/dashboard/admin") alone — that would match /dashboard/admin-preview.
  return pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isLockedAdminPath(pathname)) {
    return NextResponse.next();
  }

  const session = decodeSession(request.cookies.get("act_session")?.value);
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    login.searchParams.set("role", "super_admin");
    return NextResponse.redirect(login);
  }
  if (session.role !== "super_admin") {
    const dash = new URL("/dashboard", request.url);
    dash.searchParams.set("error", "forbidden");
    return NextResponse.redirect(dash);
  }

  return NextResponse.next();
}

export const config = {
  // Include `/dashboard/admin` — `:path*` alone may not match the bare path on all versions.
  matcher: ["/dashboard/admin", "/dashboard/admin/:path*"],
};
