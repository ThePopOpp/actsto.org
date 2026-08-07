import { NextResponse } from "next/server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getMessagingUser, getParticipantIdentities } from "@/lib/messaging/server";
import { messageableRoles, studentMeetsAgeGate, type MessagingRole } from "@/lib/messaging/permissions";

export const dynamic = "force-dynamic";

const GRANULAR: Record<MessagingRole, string[]> = {
  admin: ["super_admin"],
  parent: ["parent", "guardian", "parent_guardian"],
  student: ["student"],
  donor: ["individual_donor", "donor_individual", "business_donor", "donor_business", "donor"],
};

/** Search users the signed-in user is allowed to message (permission-filtered). */
export async function GET(request: Request) {
  const me = await getMessagingUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const targetRoles = messageableRoles(me.messagingRole);
  const granular = targetRoles.flatMap((r) => GRANULAR[r]);
  if (granular.length === 0) return NextResponse.json({ recipients: [] });

  // Super Admin is a flag on the profile, not a `user_roles` row — so matching
  // on user_roles alone found no admins at all, and admins couldn't see each
  // other in the picker even though the role matrix allows admin↔admin.
  // `resolveRole` already treats these flags as "admin"; this makes the query
  // agree with it.
  const roleMatch: Prisma.ProfileWhereInput[] = [
    { userRoles: { some: { status: "active", role: { in: granular } } } },
  ];
  if (targetRoles.includes("admin")) {
    roleMatch.push({ isSuperAdmin: true }, { isAdmin: true });
  }

  const search: Prisma.ProfileWhereInput[] = q
    ? [
        {
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { fullName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      ]
    : [];

  const profiles = await prisma.profile.findMany({
    where: {
      id: { not: me.userId },
      status: "active",
      // AND-wrapped so the role match and the search term can't collapse into
      // one OR and widen the results.
      AND: [{ OR: roleMatch }, ...search],
    },
    include: { userRoles: { where: { status: "active" } } },
    take: 25,
    orderBy: { displayName: "asc" },
  });

  const identities = await getParticipantIdentities(profiles.map((p) => p.id));

  // Donor → student: only surface 16+ students who opted in to donor messages.
  let results = profiles.map((p) => identities.get(p.id)).filter(Boolean) as NonNullable<ReturnType<typeof identities.get>>[];
  if (me.messagingRole === "donor") {
    const studentIds = results.filter((r) => r.role === "student").map((r) => r.userId);
    if (studentIds.length) {
      const students = await prisma.student.findMany({
        where: { studentUserId: { in: studentIds } },
        select: { studentUserId: true, ageVerified: true, birthDate: true, allowDonorMessages: true },
      });
      const okStudents = new Set(
        students
          .filter((s) => s.allowDonorMessages && studentMeetsAgeGate({ ageVerified: s.ageVerified, birthDate: s.birthDate, hasLoginAccount: true }))
          .map((s) => s.studentUserId!),
      );
      results = results.filter((r) => r.role !== "student" || okStudents.has(r.userId));
    }
  }

  return NextResponse.json({ recipients: results });
}
