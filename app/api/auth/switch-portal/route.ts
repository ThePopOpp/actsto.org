import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { decodeSession, encodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { dashboardPathForRole } from "@/lib/auth/paths";
import type { PortalRole, UserRole } from "@/lib/auth/types";
import { PORTAL_ROLES } from "@/lib/auth/types";

function isPortalRoleString(s: string): s is PortalRole {
  return (PORTAL_ROLES as readonly string[]).includes(s);
}

export async function POST(req: Request) {
  const jar = await cookies();
  const session = decodeSession(jar.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (session.role === "super_admin") {
    return NextResponse.json({ error: "Use the admin dashboard." }, { status: 400 });
  }

  const body = (await req.json()) as { role?: string };
  const nextRole = body.role ?? "";
  if (!isPortalRoleString(nextRole)) {
    return NextResponse.json({ error: "Invalid portal." }, { status: 400 });
  }
  if (!session.roles.includes(nextRole)) {
    return NextResponse.json({ error: "Portal not enabled for this account." }, { status: 403 });
  }

  const updated = {
    ...session,
    role: nextRole as UserRole,
  };
  const token = encodeSession(updated);
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  };

  const res = NextResponse.json({
    ok: true,
    redirect: dashboardPathForRole(nextRole),
  });
  res.cookies.set(SESSION_COOKIE_NAME, token, cookieOpts);
  return res;
}
