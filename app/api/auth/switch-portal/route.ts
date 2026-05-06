import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { decodeSession, encodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { dashboardPathForRole } from "@/lib/auth/paths";
import type { PortalRole, UserRole } from "@/lib/auth/types";
import { PORTAL_ROLES } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase/server";

function isPortalRoleStr(s: string): s is PortalRole {
  return (PORTAL_ROLES as readonly string[]).includes(s);
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 14,
};

export async function POST(req: Request) {
  const body = (await req.json()) as { role?: string };
  const nextRole = body.role ?? "";

  if (!isPortalRoleStr(nextRole)) {
    return NextResponse.json({ error: "Invalid portal." }, { status: 400 });
  }

  // ── Resolve identity (Supabase Auth primary, cookie fallback) ──────────────
  let userId: string | null = null;
  let currentSession = null;

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) userId = user.id;
  } catch { /* fall through */ }

  const jar = await cookies();
  currentSession = decodeSession(jar.get(SESSION_COOKIE_NAME)?.value);

  if (!userId && !currentSession) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (currentSession?.role === "super_admin") {
    return NextResponse.json({ error: "Use the admin dashboard." }, { status: 400 });
  }

  // Validate the requested role is enabled for this user
  if (currentSession && !currentSession.roles.includes(nextRole)) {
    return NextResponse.json({ error: "Portal not enabled for this account." }, { status: 403 });
  }

  // Persist active account type in Profile
  if (userId) {
    try {
      await prisma.profile.update({
        where: { id: userId },
        data: { activeAccountType: nextRole },
      });
    } catch { /* non-critical — DB may be temporarily unavailable */ }
  }

  // Re-encode the act_session cookie with the new active role
  const updated = currentSession
    ? { ...currentSession, role: nextRole as UserRole }
    : { email: "", name: "", role: nextRole as UserRole, roles: [nextRole] };

  const res = NextResponse.json({ ok: true, redirect: dashboardPathForRole(nextRole) });
  res.cookies.set(SESSION_COOKIE_NAME, encodeSession(updated), COOKIE_OPTS);
  return res;
}
