import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Students a parent/guardian may attach to their campaigns.
 *
 * A child belongs to the family either because the parent created the record
 * (`parent_user_id`) or because they were added as a guardian later
 * (`student_guardians`). Both branches matter: a second guardian on the same
 * household needs to reach the same children without duplicating them.
 */
export function familyStudentWhere(userId: string): Prisma.StudentWhereInput {
  return {
    OR: [{ parentUserId: userId }, { guardians: { some: { guardianUserId: userId } } }],
  };
}

export const FAMILY_STUDENT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  nickname: true,
  grade: true,
  birthDate: true,
  ageVerified: true,
  profilePhotoUrl: true,
  status: true,
  studentUserId: true,
  studentInviteEmail: true,
  studentInviteExpiresAt: true,
  schoolId: true,
  school: { select: { id: true, name: true } },
  campaignStudents: {
    orderBy: { createdAt: "asc" },
    select: {
      individualGoal: true,
      amountAllocated: true,
      campaign: { select: { id: true, slug: true, title: true, status: true, endsAt: true } },
    },
  },
} satisfies Prisma.StudentSelect;

export type FamilyStudent = Prisma.StudentGetPayload<{ select: typeof FAMILY_STUDENT_SELECT }>;

/** Load every student on this family's account, newest first. */
export async function listFamilyStudents(userId: string): Promise<FamilyStudent[]> {
  return prisma.student.findMany({
    where: familyStudentWhere(userId),
    orderBy: [{ createdAt: "desc" }],
    select: FAMILY_STUDENT_SELECT,
  });
}

/**
 * Narrow a set of client-supplied student ids to the ones this family actually
 * owns. Ids arrive from the browser, so nothing may be linked to a campaign
 * before it has been checked against the owner's own children.
 */
export async function filterOwnedStudentIds(
  tx: Prisma.TransactionClient,
  userId: string,
  studentIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(studentIds.filter(Boolean))];
  if (ids.length === 0) return new Set();
  const rows = await tx.student.findMany({
    where: { id: { in: ids }, ...familyStudentWhere(userId) },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}

export type StudentInput = {
  firstName: string;
  lastName?: string | null;
  nickname?: string | null;
  grade?: string | null;
  birthDate?: Date | null;
  profilePhotoUrl?: string | null;
  schoolId?: string | null;
  phone?: string | null;
};

/**
 * Create a student on a parent's account and record the guardian link in the
 * same step, so the child is reachable through either relationship from the
 * moment they exist.
 */
export async function createFamilyStudent(
  tx: Prisma.TransactionClient,
  userId: string,
  input: StudentInput,
): Promise<{ id: string }> {
  const student = await tx.student.create({
    data: {
      parentUserId: userId,
      schoolId: input.schoolId ?? null,
      firstName: input.firstName,
      lastName: input.lastName || null,
      nickname: input.nickname || null,
      grade: input.grade || null,
      birthDate: input.birthDate ?? null,
      profilePhotoUrl: input.profilePhotoUrl || null,
      phone: input.phone || null,
      phoneNormalized: input.phone || null,
      createdBy: userId,
      status: "draft",
    },
    select: { id: true },
  });

  await tx.studentGuardian.upsert({
    where: { studentId_guardianUserId: { studentId: student.id, guardianUserId: userId } },
    create: {
      studentId: student.id,
      guardianUserId: userId,
      relationship: "parent",
      isPrimary: true,
      permissionStatus: "granted",
    },
    update: {},
  });

  return student;
}

export type ParentStudentPayload = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  name: string;
  grade: string;
  birthDate: string | null;
  ageVerified: boolean;
  photo: string;
  schoolId: string | null;
  school: string;
  studentUserId: string | null;
  studentInviteEmail: string | null;
  studentInviteExpiresAt: string | null;
  campaigns: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    individualGoal: number;
    /** Campaign end date, so the students calendar can show what is coming up. */
    endsAt: string | null;
  }>;
};

/** Shape a student for the browser — no invite tokens, no internal columns. */
export function serializeFamilyStudent(student: FamilyStudent): ParentStudentPayload {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName ?? "",
    nickname: student.nickname ?? "",
    name: [student.firstName, student.lastName].filter(Boolean).join(" "),
    grade: student.grade ?? "",
    birthDate: student.birthDate ? student.birthDate.toISOString().slice(0, 10) : null,
    ageVerified: student.ageVerified,
    photo: student.profilePhotoUrl ?? "",
    schoolId: student.schoolId,
    school: student.school?.name ?? "",
    studentUserId: student.studentUserId,
    studentInviteEmail: student.studentInviteEmail,
    studentInviteExpiresAt: student.studentInviteExpiresAt
      ? student.studentInviteExpiresAt.toISOString()
      : null,
    campaigns: student.campaignStudents.map((link) => ({
      id: link.campaign.id,
      slug: link.campaign.slug,
      title: link.campaign.title,
      status: link.campaign.status,
      individualGoal: Number(link.individualGoal ?? 0),
      endsAt: link.campaign.endsAt ? link.campaign.endsAt.toISOString() : null,
    })),
  };
}

/**
 * Records that must outlive a student.
 *
 * Deleting the row would cascade scholarship applications, awards and year
 * eligibility away, and the database blocks it outright once a donation
 * allocation points at the child. A parent tidying up their account must not be
 * able to erase money or scholarship history, so those students are protected
 * and can only be removed from a campaign.
 */
export type StudentDeleteBlock = {
  reason: string;
  counts: Record<string, number>;
};

export async function findStudentDeleteBlock(
  tx: Prisma.TransactionClient,
  studentId: string,
): Promise<StudentDeleteBlock | null> {
  const [allocations, recommendations, applications, awards, student] = await Promise.all([
    tx.donationAllocation.count({ where: { studentId } }),
    tx.donorRecommendation.count({ where: { recommendedStudentId: studentId } }),
    tx.scholarshipApplication.count({ where: { studentId } }),
    tx.scholarshipAward.count({ where: { studentId } }),
    tx.student.findUnique({ where: { id: studentId }, select: { studentUserId: true } }),
  ]);

  const counts = { allocations, recommendations, applications, awards };
  const blocked = allocations + recommendations + applications + awards;

  if (blocked > 0) {
    const parts = [
      allocations > 0 ? "donations directed to them" : null,
      recommendations > 0 ? "donor recommendations" : null,
      applications > 0 ? "a scholarship application" : null,
      awards > 0 ? "a scholarship award" : null,
    ].filter(Boolean);
    return {
      reason: `This student has ${parts.join(", ")} on record, so their account entry has to be kept. You can still remove them from any campaign.`,
      counts,
    };
  }

  if (student?.studentUserId) {
    return {
      reason:
        "This student has their own login connected. Disconnect that login before removing them from your account.",
      counts,
    };
  }

  return null;
}

/** Campaign ids a student is currently on — used to refresh setup progress after a change. */
export async function campaignIdsForStudent(tx: Prisma.TransactionClient, studentId: string) {
  const links = await tx.campaignStudent.findMany({
    where: { studentId },
    select: { campaignId: true },
  });
  return links.map((link) => link.campaignId);
}

/** Normalised name key used to spot the same child entered twice. */
export function duplicateKey(student: { firstName: string; lastName: string | null }) {
  return [student.firstName, student.lastName ?? ""]
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
}

export type DuplicateGroup = { key: string; name: string; studentIds: string[] };

/**
 * Group a family's students by name so the UI can offer to merge them.
 *
 * Campaign creation used to mint a fresh student row every time, so a parent
 * running two campaigns for the same child ends up with the same kid twice.
 * Nothing detects that automatically — the parent confirms the merge.
 */
export function findDuplicateGroups(students: FamilyStudent[]): DuplicateGroup[] {
  const byKey = new Map<string, FamilyStudent[]>();
  for (const student of students) {
    const key = duplicateKey(student);
    if (!key.replace("|", "")) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), student]);
  }

  return [...byKey.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      key,
      name: [group[0].firstName, group[0].lastName].filter(Boolean).join(" "),
      studentIds: group.map((student) => student.id),
    }));
}

/**
 * Find a child already on the account whose full name is typed in again.
 *
 * Campaign forms let a parent type a student instead of picking them, which is
 * how the duplicate records appeared in the first place. Matching on first AND
 * last name — both present — reuses the existing record rather than minting a
 * second one. A name with no surname is too thin to match on, so those still
 * create a new student.
 */
export async function findFamilyStudentByName(
  tx: Prisma.TransactionClient,
  userId: string,
  firstName: string,
  lastName: string | null | undefined,
): Promise<{ id: string } | null> {
  const first = firstName.trim();
  const last = (lastName ?? "").trim();
  if (!first || !last) return null;

  const candidates = await tx.student.findMany({
    where: {
      ...familyStudentWhere(userId),
      firstName: { equals: first, mode: "insensitive" },
      lastName: { equals: last, mode: "insensitive" },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 1,
  });
  return candidates[0] ?? null;
}
