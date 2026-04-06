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
import { isPortalRole } from "@/lib/auth/types";
import { portalRolesFromUser } from "@/lib/auth/user-roles";
import { prisma } from "@/lib/prisma";

const ROLES: UserRole[] = [
  "super_admin",
  "parent",
  "student",
  "donor_individual",
  "donor_business",
];

function isRole(s: string): s is UserRole {
  return ROLES.includes(s as UserRole);
}

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
  const passwordRaw = body.password ?? "";
  const roleRaw = body.role ?? "donor_individual";
  if (!emailInput) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }
  if (!isRole(roleRaw)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const tempOk = isTempSuperAdminCredentials(emailInput, String(passwordRaw));

  if (!tempOk && roleRaw === "super_admin" && !isSuperAdminEmail(emailLower)) {
    return NextResponse.json(
      {
        error:
          "Super Admin is locked down: add your exact sign-in email to ADMIN_EMAILS in .env (comma-separated), or set TEMP_SUPER_ADMIN_EMAIL and TEMP_SUPER_ADMIN_PASSWORD and sign in with that pair (any account type). Restart dev after changing .env.",
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

  let session: ActSession;

  const dbUser = await prisma.user.findUnique({ where: { email: emailLower } });

  if (dbUser) {
    const pwOk = await compare(String(passwordRaw), dbUser.password);
    if (!pwOk) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const assignedPortals = portalRolesFromUser(dbUser);
    const displayName = (dbUser.name ?? displayNameBase).trim();

    if (roleRaw === "super_admin") {
      if (!tempOk && !isSuperAdminEmail(emailLower)) {
        return NextResponse.json(
          {
            error:
              "Super Admin is locked down: add your exact sign-in email to ADMIN_EMAILS in .env (comma-separated), or set TEMP_SUPER_ADMIN_EMAIL and TEMP_SUPER_ADMIN_PASSWORD and sign in with that pair (any account type). Restart dev after changing .env.",
          },
          { status: 403 }
        );
      }
      session = {
        email: dbUser.email,
        name: displayName,
        role: "super_admin",
        roles: [],
      };
    } else {
      if (!assignedPortals.includes(roleRaw as PortalRole)) {
        return NextResponse.json(
          {
            error:
              "That account type is not enabled for this email. Sign in with a portal you have access to, or contact support.",
          },
          { status: 403 }
        );
      }
      session = {
        email: dbUser.email,
        name: displayName,
        role: roleRaw,
        roles: assignedPortals,
      };
    }
  } else {
    if (roleRaw === "super_admin") {
      session = {
        email: emailInput,
        name: displayNameBase,
        role: "super_admin",
        roles: [],
      };
    } else {
      session = {
        email: emailInput,
        name: displayNameBase,
        role: roleRaw,
        roles: isPortalRole(roleRaw) ? [roleRaw] : [],
      };
    }
  }

  const token = encodeSession(session);
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  };

  let redirect = body.next?.startsWith("/") ? body.next : undefined;
  if (!redirect || redirect.startsWith("//")) {
    redirect = dashboardPathForRole(session.role);
  }

  const res = NextResponse.json({ ok: true, redirect });
  res.cookies.set(SESSION_COOKIE_NAME, token, cookieOpts);
  return res;
}
