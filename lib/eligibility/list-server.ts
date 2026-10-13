import "server-only";

import type { Prisma } from "@prisma/client";

import { DISPLACED_SCOPE, isEligibilityFlag, isFlagStatus } from "@/lib/eligibility/flags";
import { canonicalGrade, isGradeLabel, ALL_GRADES } from "@/lib/grades";
import { prisma } from "@/lib/prisma";

export type EligibilityFilters = {
  flag?: string;
  status?: string;
  year?: string;
  /** Only students with no active award for the school year filtered on. */
  noAward?: boolean;
  /** Only students at this school (schools.id). */
  schoolId?: string;
};

export type EligibilityRow = {
  flagId: string;
  studentId: string;
  studentName: string;
  schoolName: string | null;
  grade: string | null;
  flag: string;
  schoolYear: string;
  status: string;
  source: string;
  reason: string | null;
  decidedAt: string | null;
  decidedByEmail: string | null;
  details: unknown;
  documentId: string | null;
  sourceApplicationId: string | null;
  verificationId: string | null;
  awardedThisYear: number;
};

/** Flags matching the filters, with the student and who decided each. */
export async function listEligibility(filters: EligibilityFilters): Promise<EligibilityRow[]> {
  const where: Prisma.StudentEligibilityFlagWhereInput = {
    ...(isEligibilityFlag(filters.flag) ? { flag: filters.flag } : {}),
    ...(isFlagStatus(filters.status) ? { status: filters.status } : {}),
    // Displaced is K-12 wide, so it matches any school year filter.
    ...(filters.year ? { schoolYear: { in: [filters.year, DISPLACED_SCOPE] } } : {}),
    ...(filters.schoolId ? { student: { schoolId: filters.schoolId } } : {}),
  };

  const flags = await prisma.studentEligibilityFlag.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: 1000,
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          grade: true,
          school: { select: { name: true } },
          scholarshipAwards: {
            where: { status: { not: "reversed" }, ...(filters.year ? { schoolYear: filters.year } : {}) },
            select: { awardAmount: true },
          },
        },
      },
    },
  });

  const deciderIds = [...new Set(flags.map((f) => f.decidedBy).filter(Boolean))] as string[];
  const deciders = deciderIds.length
    ? await prisma.profile.findMany({ where: { id: { in: deciderIds } }, select: { id: true, email: true } })
    : [];
  const emailById = new Map(deciders.map((d) => [d.id, d.email]));

  const rows = flags.map((f) => ({
    flagId: f.id,
    studentId: f.studentId,
    studentName: [f.student.firstName, f.student.lastName].filter(Boolean).join(" "),
    schoolName: f.student.school?.name ?? null,
    grade: f.student.grade,
    flag: f.flag,
    schoolYear: f.schoolYear,
    status: f.status,
    source: f.source,
    reason: f.reason,
    decidedAt: f.decidedAt?.toISOString() ?? null,
    decidedByEmail: f.decidedBy ? emailById.get(f.decidedBy) ?? null : null,
    details: f.details,
    documentId: f.documentId,
    sourceApplicationId: f.sourceApplicationId,
    verificationId: f.verificationId,
    awardedThisYear: f.student.scholarshipAwards.reduce((s, a) => s + Number(a.awardAmount), 0),
  }));
  return filters.noAward ? rows.filter((r) => r.awardedThisYear === 0) : rows;
}

export type GradeReviewRow = {
  kind: "student" | "application";
  id: string;
  name: string;
  grade: string;
  suggestion: string | null;
  link: string;
};

/**
 * Grades that aren't on the shared list. The migration mapped the common
 * variants; anything left is here for a person to fix rather than a guess.
 */
export async function gradesNeedingReview(): Promise<GradeReviewRow[]> {
  const [students, applications] = await Promise.all([
    prisma.student.findMany({
      where: { grade: { not: null }, status: { not: "archived" } },
      select: { id: true, firstName: true, lastName: true, grade: true, parentUserId: true },
    }),
    prisma.scholarshipApplication.findMany({
      where: { grade: { not: null } },
      select: { id: true, grade: true, student: { select: { firstName: true, lastName: true } } },
    }),
  ]);
  const bad = (g: string | null) => Boolean(g) && !isGradeLabel(g) && g !== ALL_GRADES;
  return [
    ...students
      .filter((s) => bad(s.grade))
      .map((s) => ({
        kind: "student" as const,
        id: s.id,
        name: [s.firstName, s.lastName].filter(Boolean).join(" "),
        grade: s.grade!,
        suggestion: canonicalGrade(s.grade),
        link: `/dashboard/admin/users`,
      })),
    ...applications
      .filter((a) => bad(a.grade))
      .map((a) => ({
        kind: "application" as const,
        id: a.id,
        name: [a.student.firstName, a.student.lastName].filter(Boolean).join(" "),
        grade: a.grade!,
        suggestion: canonicalGrade(a.grade),
        link: `/dashboard/admin/scholarships/${a.id}`,
      })),
  ];
}

export type StudentSchoolRow = {
  id: string;
  name: string;
  grade: string | null;
  schoolId: string | null;
  schoolName: string | null;
  parentEmail: string | null;
  /** Schools named on the student's applications or campaigns, as a hint. */
  namedSchools: string[];
};

/**
 * Students for the school panel: every student at `schoolId`, or, without
 * one, every student with no school recorded, so none is left showing
 * "No school" unnoticed.
 */
export async function listStudentSchools(schoolId?: string): Promise<StudentSchoolRow[]> {
  const students = await prisma.student.findMany({
    where: { status: { not: "archived" }, schoolId: schoolId ?? null },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 500,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      grade: true,
      schoolId: true,
      parentUserId: true,
      school: { select: { name: true } },
      scholarshipApps: { select: { schoolNameOther: true, school: { select: { name: true } } } },
      campaignStudents: { select: { campaign: { select: { school: { select: { name: true } } } } } },
    },
  });
  const parentIds = [...new Set(students.map((s) => s.parentUserId))];
  const parents = parentIds.length
    ? await prisma.profile.findMany({ where: { id: { in: parentIds } }, select: { id: true, email: true } })
    : [];
  return students.map((s) => ({
    id: s.id,
    name: [s.firstName, s.lastName].filter(Boolean).join(" "),
    grade: s.grade,
    schoolId: s.schoolId,
    schoolName: s.school?.name ?? null,
    parentEmail: parents.find((p) => p.id === s.parentUserId)?.email ?? null,
    namedSchools: Array.from(
      new Set(
        [
          ...s.scholarshipApps.map((a) => a.school?.name ?? (a.schoolNameOther ? `${a.schoolNameOther} (typed)` : null)),
          ...s.campaignStudents.map((c) => c.campaign.school?.name ?? null),
        ].filter((name): name is string => Boolean(name)),
      ),
    ),
  }));
}
