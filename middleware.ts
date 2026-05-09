import { NextResponse, type NextRequest } from "next/server";

import { decodeSession } from "@/lib/auth/cookie";

// Keep this edge-compatible. Do not import admin-allowlist here because that
// path reaches the temp-super-admin node:crypto helper.
function isAdminEmail(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowlisted = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalizedEmail);
  if (allowlisted) return true;

  const bootstrapEmail = process.env.TEMP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const bootstrapPassword = process.env.TEMP_SUPER_ADMIN_PASSWORD;
  return Boolean(
    bootstrapEmail &&
      bootstrapPassword !== undefined &&
      bootstrapPassword !== "" &&
      normalizedEmail === bootstrapEmail
  );
}

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

  if (session.role !== "super_admin" || !isAdminEmail(session.email)) {
    const dash = new URL("/dashboard", request.url);
    dash.searchParams.set("error", "forbidden");
    return NextResponse.redirect(dash);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/admin", "/dashboard/admin/:path*"],
};
