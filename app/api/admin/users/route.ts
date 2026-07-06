import { NextResponse } from "next/server";

import { campaignsCountsByEmail } from "@/lib/admin/campaigns-counts";
import { prismaUserToAdminSample, profileToAdminSample } from "@/lib/admin/user-dto";
import { inviteUser, isInviteRole, parseAccountStatus } from "@/lib/admin/invite-user";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [profiles, legacyUsers, counts] = await Promise.all([
    prisma.profile.findMany({
      include: { userRoles: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    campaignsCountsByEmail(),
  ]);

  const profileEmails = new Set(profiles.map((profile) => profile.email.toLowerCase()));
  const list = [
    ...profiles.map((profile) =>
      profileToAdminSample(profile, counts.get(profile.email.toLowerCase()) ?? 0)
    ),
    ...legacyUsers
      .filter((user) => !profileEmails.has(user.email.toLowerCase()))
      .map((user) => prismaUserToAdminSample(user, counts.get(user.email.toLowerCase()) ?? 0)),
  ];
  return NextResponse.json({ users: list });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    password?: string;
  } | null;

  const name = (body?.name ?? "").trim() || "Unnamed user";
  const email = (body?.email ?? "").trim();
  const password = body?.password ?? "";
  const role = body?.role;
  const statusRaw = body?.status;

  if (!role || !isInviteRole(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  const accountStatus = statusRaw ? parseAccountStatus(statusRaw) : null;
  if (!accountStatus) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  try {
    const user = await inviteUser({ name, email, role, status: accountStatus, password });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create app profile." },
      { status: 400 }
    );
  }
}
