import "server-only";

import { householdNeed } from "@/lib/award-policy/decisions-server";
import { logAdminActivity } from "@/lib/admin/audit";
import { AllocationError, type AllocationActor } from "@/lib/allocation/server";
import { prisma } from "@/lib/prisma";

/** The school year before "2026/2027": "2025/2026". */
export function priorSchoolYear(schoolYear: string): string | null {
  const m = /^(\d{4})\/(\d{4})$/.exec(schoolYear);
  return m ? `${Number(m[1]) - 1}/${Number(m[2]) - 1}` : null;
}

export type PriorityFactors = {
  /** Received an ACTSTO award last school year. */
  returning: boolean;
  /** Shares a household with a current-year or prior-year recipient. */
  sibling: boolean;
  /** On the Overflow waiting list, with the date added. */
  waitingListSince: string | null;
  hasNarrative: boolean;
  /** Household income as a percent of the reduced-price lunch limit. */
  pctOfRplLimit: number | null;
};

/**
 * Priority factors for many students at once. A household is the parent
 * account a student is on, or a guardian they share with another student.
 */
export async function priorityFactors(studentIds: string[], schoolYear: string): Promise<Map<string, PriorityFactors>> {
  const out = new Map<string, PriorityFactors>();
  if (!studentIds.length) return out;
  const prior = priorSchoolYear(schoolYear);
  const [students, awards, waiting, applications] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, parentUserId: true, guardians: { select: { guardianUserId: true } } },
    }),
    prisma.scholarshipAward.findMany({
      where: { status: { not: "reversed" }, schoolYear: { in: [schoolYear, ...(prior ? [prior] : [])] } },
      select: { studentId: true, schoolYear: true, student: { select: { parentUserId: true, guardians: { select: { guardianUserId: true } } } } },
    }),
    prisma.overflowWaitingListEntry.findMany({
      where: { studentId: { in: studentIds }, removedAt: null },
      orderBy: { addedOn: "asc" },
      select: { studentId: true, addedOn: true },
    }),
    prisma.scholarshipApplication.findMany({
      where: { studentId: { in: studentIds }, schoolYear, status: { notIn: ["draft", "withdrawn"] } },
      select: { studentId: true, narrative: true },
    }),
  ]);

  // Households of every recipient this year and last year.
  const recipientHouseholds = new Map<string, Set<string>>();
  for (const a of awards) {
    for (const h of [a.student.parentUserId, ...a.student.guardians.map((g) => g.guardianUserId)]) {
      const set = recipientHouseholds.get(h) ?? new Set<string>();
      set.add(a.studentId);
      recipientHouseholds.set(h, set);
    }
  }
  const returningIds = new Set(awards.filter((a) => a.schoolYear === prior).map((a) => a.studentId));

  for (const s of students) {
    const households = [s.parentUserId, ...s.guardians.map((g) => g.guardianUserId)];
    const sibling = households.some((h) => [...(recipientHouseholds.get(h) ?? [])].some((id) => id !== s.id));
    const need = await householdNeed(s.id, schoolYear);
    out.set(s.id, {
      returning: returningIds.has(s.id),
      sibling,
      waitingListSince: waiting.find((w) => w.studentId === s.id)?.addedOn.toISOString() ?? null,
      hasNarrative: Boolean(applications.find((a) => a.studentId === s.id)?.narrative?.trim()),
      pctOfRplLimit: need.pctOfRplLimit,
    });
  }
  return out;
}

/** Students on the waiting list, and siblings of anyone on it: first in Overflow views. */
export async function waitingListHouseholdIds(studentIds: string[]): Promise<Set<string>> {
  const entries = await prisma.overflowWaitingListEntry.findMany({
    where: { removedAt: null },
    select: { student: { select: { id: true, parentUserId: true, guardians: { select: { guardianUserId: true } } } } },
  });
  const households = new Set(entries.flatMap((e) => [e.student.parentUserId, ...e.student.guardians.map((g) => g.guardianUserId)]));
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, parentUserId: true, guardians: { select: { guardianUserId: true } } },
  });
  return new Set(
    students.filter((s) => [s.parentUserId, ...s.guardians.map((g) => g.guardianUserId)].some((h) => households.has(h))).map((s) => s.id),
  );
}

export async function addToWaitingList(actor: AllocationActor, studentId: string, note: string) {
  const open = await prisma.overflowWaitingListEntry.findFirst({ where: { studentId, removedAt: null } });
  if (open) throw new AllocationError("This student is already on the waiting list.", 409);
  const entry = await prisma.overflowWaitingListEntry.create({
    data: { studentId, addedBy: actor.id, addedByEmail: actor.email, note: note.trim() || null },
  });
  await logAdminActivity({ actorId: actor.id, actorEmail: actor.email, action: "waiting_list.add", entityType: "student", entityId: studentId, after: { note } });
  return entry;
}

export async function removeFromWaitingList(actor: AllocationActor, studentId: string) {
  const result = await prisma.overflowWaitingListEntry.updateMany({
    where: { studentId, removedAt: null },
    data: { removedAt: new Date(), removedByEmail: actor.email },
  });
  if (!result.count) throw new AllocationError("This student isn't on the waiting list.", 404);
  await logAdminActivity({ actorId: actor.id, actorEmail: actor.email, action: "waiting_list.remove", entityType: "student", entityId: studentId });
}
