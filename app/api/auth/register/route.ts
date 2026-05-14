import { NextResponse } from "next/server";

import { encodeSession, SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import {
  consumeStudentInvite,
  ensureRoleScaffold,
  syncAccountSetupProgress,
} from "@/lib/auth/account-types";
import { dashboardPathForRole } from "@/lib/auth/paths";
import type { ActSession, PortalRole } from "@/lib/auth/types";
import { PORTAL_ROLES } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/sms/twilio";
import { createServiceClient } from "@/lib/supabase/server";

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

/**
 * POST /api/auth/register
 *
 * Creates a Supabase Auth user, waits for the DB trigger to create the Profile,
 * then creates a UserRoleRecord for the requested role.
 *
 * Body: { email, password, firstName, lastName, phone?, role }
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: string;
    displayName?: string;
    birthDate?: string;
    studentInviteToken?: string;
  };

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const phone = (body.phone ?? "").trim() || null;
  const phoneNormalized = phone ? normalizePhone(phone) : null;
  const role = body.role ?? "";
  const displayName = (body.displayName ?? "").trim() || null;
  const studentInviteToken = (body.studentInviteToken ?? "").trim();

  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (!firstName) return NextResponse.json({ error: "First name required." }, { status: 400 });
  if (!isPortalRoleStr(role))
    return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
  if (role === "student" && !studentInviteToken) {
    return NextResponse.json(
      { error: "Student accounts require an invite from a parent or guardian." },
      { status: 400 }
    );
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  // Use service client so the signup isn't subject to RLS / email confirmation in dev
  const supabase = createServiceClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm; remove when email verification is enabled
    user_metadata: { full_name: fullName, first_name: firstName, last_name: lastName },
  });

  if (error) {
    const msg = error.message?.includes("already registered")
      ? "An account with this email already exists."
      : error.message ?? "Registration failed.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = data.user.id;

  // The handle_new_user trigger creates the Profile row; upsert to be safe
  try {
    await prisma.profile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        fullName,
        firstName,
        lastName,
        displayName,
        phone,
        phoneNormalized,
        primaryAccountType: role,
        activeAccountType: role,
        status: "active",
      },
      update: {
        fullName,
        firstName,
        lastName,
        displayName,
        phone,
        phoneNormalized,
        primaryAccountType: role,
        activeAccountType: role,
      },
    });

    await ensureRoleScaffold(userId, role);
    if (role === "student") {
      await consumeStudentInvite({ token: studentInviteToken, userId, email });
    }
    await syncAccountSetupProgress(userId, role);
  } catch (error) {
    if (role === "student") {
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not connect this student invite.",
        },
        { status: 400 },
      );
    }
    // DB unavailable: the trigger will create the profile asynchronously for non-student roles.
  }

  // Build session and set act_session cookie for immediate dashboard access
  const session: ActSession = {
    email,
    name: fullName || email.split("@")[0],
    role,
    roles: [role],
  };

  const res = NextResponse.json({
    ok: true,
    redirect: dashboardPathForRole(role),
  });
  res.cookies.set(SESSION_COOKIE_NAME, encodeSession(session), COOKIE_OPTS);
  return res;
}
