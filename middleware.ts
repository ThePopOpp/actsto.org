import { NextResponse, type NextRequest } from "next/server";

import { canAccessSuperAdminDashboard } from "@/lib/auth/admin-allowlist";
import { decodeSession } from "@/lib/auth/cookie";

function isLockedAdminPath(pathname: string): boolean {
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

  if (session.role !== "super_admin" || !canAccessSuperAdminDashboard(session.email)) {
    const dash = new URL("/dashboard", request.url);
    dash.searchParams.set("error", "forbidden");
    return NextResponse.redirect(dash);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/admin", "/dashboard/admin/:path*"],
};
