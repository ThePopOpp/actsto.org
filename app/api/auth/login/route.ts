import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import { isSuperAdminEmail } from "@/lib/auth/admin-allowlist";
import { encodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { dashboardPathForRole } from "@/lib/auth/paths";
import {
  isReservedTempSuperAdminEmail,
  isTempSuperAdminCredentials,
} from "@/lib/auth/temp-super-admin";
import type { ActSession, PortalRole, UserRole } from "@/lib/auth/types";
import { isPortalRole, PORTAL_ROLES } from "@/lib/auth/types";
import { portalRolesFromUser } from "@/lib/auth/user-roles";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@/lib/supabase/server";

const ALL_ROLES: UserRole[] = [
  "super_admin",
  "parent",
  "student",
  "donor_individual",
  "donor_business",
];

function isRole(s: string): s is UserRole {
  return ALL_ROLES.includes(s as UserRole);
}

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
  const body = (await req.json()) as {
    email?: string;
    password?: string;
    role?: string;
    name?: string;
    next?: string;
  };

  const emailInput = (body.email ?? "").trim();
  const emailLower = emailInput.toLowerCase();
  const passwordRaw = String(body.password ?? "");
  const roleRaw = body.role;

  if (!emailInput) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }
  if (roleRaw && !isRole(roleRaw)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const tempOk = isTempSuperAdminCredentials(emailInput, passwordRaw);

  if (!tempOk && roleRaw === "super_admin" && !isSuperAdminEmail(emailLower)) {
    return NextResponse.json(
      {
        error:
          "Super Admin is locked down: add your exact sign-in email to ADMIN_EMAILS in .env (comma-separated), or set TEMP_SUPER_ADMIN_EMAIL and TEMP_SUPER_ADMIN_PASSWORD. Restart dev after changing .env.",
      },
      { status: 403 }
    );
  }

  if (!tempOk && isReservedTempSuperAdminEmail(emailInput)) {
    return NextResponse.json(
      { error: "Invalid password for this account." },
      { status: 401 }
    );
  }

  const displayNameBase = (body.name ?? emailInput.split("@")[0] ?? "User").trim();
  let redirect = body.next?.startsWith("/") ? body.next : undefined;

  // ── 1. Try Supabase Auth (primary path) ────────────────────────────────────
  const supabaseCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  try {
    const supabase = await createServerClient();
    // Monkey-patch to capture any cookies Supabase sets during signIn
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLower,
      password: passwordRaw,
    });

    if (!error && data.user) {
      const supaUser = data.user;
      const meta = supaUser.user_metadata as Record<string, string> | undefined;
      const displayName = (meta?.full_name ?? meta?.name ?? displayNameBase).trim();

      let session: ActSession;
      let profileRoles: PortalRole[] = [];
      let storedActiveAccountType: string | null = null;
      let profileIsSuperAdmin = false;

      // Try to load role data from Prisma Profile
      try {
        const profile = await prisma.profile.findUnique({
          where: { id: supaUser.id },
          include: { userRoles: { where: { status: "active" } } },
        });
        if (profile) {
          profileIsSuperAdmin = profile.isSuperAdmin;
          storedActiveAccountType = profile.activeAccountType;
          profileRoles = profile.userRoles
            .map((r) => r.role)
            .filter(isPortalRoleStr) as PortalRole[];
        }
      } catch {
        // DB not available — derive roles from requested role
        if (roleRaw && isPortalRoleStr(roleRaw)) profileRoles = [roleRaw];
      }

      if (roleRaw === "super_admin") {
        if (!isSuperAdminEmail(emailLower) && !profileIsSuperAdmin) {
          return NextResponse.json(
            { error: "Super Admin access not permitted for this account." },
            { status: 403 }
          );
        }
        session = { email: emailLower, name: displayName, role: "super_admin", roles: [] };
      } else {
        if (profileIsSuperAdmin && !roleRaw) {
          session = { email: emailLower, name: displayName, role: "super_admin", roles: [] };
          if (!redirect || redirect.startsWith("//")) {
            redirect = dashboardPathForRole(session.role);
          }
          const res = NextResponse.json({ ok: true, redirect });
          supabaseCookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
          });
          res.cookies.set(SESSION_COOKIE_NAME, encodeSession(session), COOKIE_OPTS);
          return res;
        }
        if (roleRaw && profileRoles.length > 0 && !profileRoles.includes(roleRaw as PortalRole)) {
          return NextResponse.json(
            {
              error:
                "That account type is not enabled for this email. Sign in with a portal you have access to.",
            },
            { status: 403 }
          );
        }
        const activeRole =
          roleRaw && isPortalRoleStr(roleRaw)
            ? roleRaw
            : storedActiveAccountType && isPortalRoleStr(storedActiveAccountType)
              ? storedActiveAccountType
              : (profileRoles[0] ?? "parent");
        const allRoles =
          profileRoles.length > 0
            ? profileRoles
            : roleRaw && isPortalRoleStr(roleRaw)
              ? [roleRaw]
              : [activeRole];
        session = {
          email: emailLower,
          name: displayName,
          role: activeRole,
          roles: allRoles,
        };

        // Update active account type in Profile
        try {
          await prisma.profile.update({
            where: { id: supaUser.id },
            data: { activeAccountType: activeRole },
          });
        } catch { /* non-critical */ }
      }

      if (!redirect || redirect.startsWith("//")) {
        redirect = dashboardPathForRole(session.role);
      }

      // Build response — copy Supabase session cookies + set act_session for middleware
      const res = NextResponse.json({ ok: true, redirect });
      // Transfer any Supabase auth cookies set on the server client
      supabaseCookies.forEach(({ name, value, options }) => {
        res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
      });
      res.cookies.set(SESSION_COOKIE_NAME, encodeSession(session), COOKIE_OPTS);
      return res;
    }
  } catch {
    // Supabase unavailable — fall through to legacy path
  }

  // ── 2. Legacy Prisma User / bcrypt (migration fallback) ────────────────────
  const dbUser = await prisma.user.findUnique({ where: { email: emailLower } }).catch(() => null);

  let session: ActSession;

  if (dbUser) {
    const pwOk = await compare(passwordRaw, dbUser.password);
    if (!pwOk) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await prisma.user.update({ where: { id: dbUser.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

    const assignedPortals = portalRolesFromUser(dbUser);
    const displayName = (dbUser.name ?? displayNameBase).trim();

    if (roleRaw === "super_admin") {
      if (!tempOk && !isSuperAdminEmail(emailLower)) {
        return NextResponse.json(
          { error: "Super Admin access not permitted for this account." },
          { status: 403 }
        );
      }
      session = { email: dbUser.email, name: displayName, role: "super_admin", roles: [] };
    } else {
      if (roleRaw && !assignedPortals.includes(roleRaw as PortalRole)) {
        return NextResponse.json(
          { error: "That account type is not enabled for this email." },
          { status: 403 }
        );
      }
      const activeRole =
        roleRaw && isPortalRoleStr(roleRaw)
          ? roleRaw
          : assignedPortals[0] ?? (dbUser.role === "super_admin" ? "super_admin" : dbUser.role);
      session = {
        email: dbUser.email,
        name: displayName,
        role: activeRole,
        roles: assignedPortals,
      };
    }
  } else {
    // No user anywhere — allow temp super admin or dev fallback
    if (roleRaw === "super_admin" && (tempOk || isSuperAdminEmail(emailLower))) {
      session = { email: emailInput, name: displayNameBase, role: "super_admin", roles: [] };
    } else if (tempOk) {
      const activeRole = roleRaw && isRole(roleRaw) ? roleRaw : "parent";
      session = {
        email: emailInput,
        name: displayNameBase,
        role: activeRole,
        roles: isPortalRole(activeRole) ? [activeRole] : [],
      };
    } else {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
  }

  if (!redirect || redirect.startsWith("//")) {
    redirect = dashboardPathForRole(session.role);
  }

  const res = NextResponse.json({ ok: true, redirect });
  res.cookies.set(SESSION_COOKIE_NAME, encodeSession(session), COOKIE_OPTS);
  return res;
}
