import "server-only";

import type { WizardData, WizardApplication } from "@/components/dashboard/scholarship/types";
import { prisma } from "@/lib/prisma";
import { schoolYearLabel } from "@/lib/scholarship/constants";
import { householdLastUpdated, listHouseholdMembers } from "@/lib/scholarship/household";
import { readIncomeSnapshot } from "@/lib/scholarship/income";
import {
  parentStudentWhere,
  requireOwnedApplication,
  type ParentActor,
} from "@/lib/scholarship/scope";
import { formatWindowDate, getWindowForYear, resolveWindowState } from "@/lib/scholarship/windows";

/**
 * Assemble everything the wizard needs in one server pass, so the client makes
 * no read requests on load and the whole thing survives a refresh.
 */

function toCertifiedIncome(snapshot: unknown): WizardData["certifiedIncome"] {
  const parsed = readIncomeSnapshot(snapshot);
  if (!parsed) return null;
  return {
    annualTotal: parsed.annual_total,
    memberCount: parsed.member_count,
    members: parsed.members.map((m) => ({
      fullName: m.full_name,
      roleLabel: m.role_label,
      annualTotal: m.annual_total,
    })),
  };
}

/** Offer the current window's year plus the next two, so the select is never empty. */
export function offeredSchoolYears(activeYear: string | null, now = new Date()): string[] {
  // The Arizona school year turns over mid-year; anything from July onward is
  // most likely applying for the year that starts this calendar year.
  const base = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const years = [schoolYearLabel(base), schoolYearLabel(base + 1), schoolYearLabel(base + 2)];
  if (activeYear && !years.includes(activeYear)) years.unshift(activeYear);
  return years;
}

export async function loadWizardData(
  applicationId: string,
  parent: ParentActor,
): Promise<WizardData> {
  const application = await requireOwnedApplication(applicationId, parent.profileId);

  const [students, schools, household, lastUpdated, profile] = await Promise.all([
    prisma.student.findMany({
      where: parentStudentWhere(parent.profileId),
      orderBy: [{ firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, grade: true, schoolId: true },
    }),
    prisma.school.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true },
    }),
    listHouseholdMembers(parent.profileId),
    householdLastUpdated(parent.profileId),
    prisma.profile.findUnique({
      where: { id: parent.profileId },
      select: {
        fullName: true,
        displayName: true,
        phone: true,
        parentGuardianProfile: {
          select: { addressLine1: true, addressLine2: true, city: true, state: true, zip: true },
        },
      },
    }),
  ]);

  const window = application.schoolYear ? await getWindowForYear(application.schoolYear) : null;
  const windowState = resolveWindowState(window);

  // The latest parent-facing message on an open information request — including
  // one whose deadline has lapsed, since the family can still reply to it.
  //
  // `internalNote` is never selected here, at any point in the parent path.
  // That is enforced by the column list, not by remembering not to render it.
  const openRequest =
    application.status === "needs_info" || application.infoNotReceived
      ? await prisma.applicationReview.findFirst({
          where: { applicationId, action: "request_info" },
          orderBy: { createdAt: "desc" },
          select: { parentMessage: true },
        })
      : null;

  const priorDenial = application.supersedesId
    ? await prisma.applicationReview.findFirst({
        where: { applicationId: application.supersedesId, action: "deny" },
        orderBy: { createdAt: "desc" },
        select: { parentMessage: true },
      })
    : null;

  const missingImported = application.supersedesId
    ? await prisma.applicationDocument.findMany({
        where: { applicationId: application.supersedesId, purgedAt: { not: null } },
        select: { fileName: true },
      })
    : [];

  const addressLines = [
    profile?.parentGuardianProfile?.addressLine1,
    profile?.parentGuardianProfile?.addressLine2,
    [
      profile?.parentGuardianProfile?.city,
      profile?.parentGuardianProfile?.state,
      profile?.parentGuardianProfile?.zip,
    ]
      .filter(Boolean)
      .join(", "),
  ].filter((line): line is string => Boolean(line && line.trim()));

  const wizardApplication: WizardApplication = {
    id: application.id,
    studentId: application.studentId,
    schoolYear: application.schoolYear,
    schoolId: application.schoolId,
    grade: application.grade,
    tuitionAfterDiscounts:
      application.tuitionAfterDiscounts === null
        ? null
        : Number(application.tuitionAfterDiscounts),
    narrative: application.narrative ?? "",
    incomeConfirmedAt: application.incomeConfirmedAt?.toISOString() ?? null,
    overflowQualification: application.overflowQualification,
    overflowOrg: application.overflowOrg,
    overflowComments: application.overflowComments,
    esaCurrentYear: application.esaCurrentYear,
    esaPriorYear: application.esaPriorYear,
    status: application.status,
    lockedAt: application.lockedAt?.toISOString() ?? null,
    confirmationCode: application.confirmationCode,
    attemptNumber: application.attemptNumber,
    needsInfoDueAt: application.needsInfoDueAt?.toISOString() ?? null,
    infoNotReceived: application.infoNotReceived,
    fieldsRequested: application.fieldsRequested,
    documents: application.documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      documentKind: doc.documentKind,
      uploadedAt: doc.uploadedAt.toISOString(),
      verifiedAt: doc.verifiedAt?.toISOString() ?? null,
    })),
  };

  return {
    application: wizardApplication,
    students: students.map((s) => ({
      id: s.id,
      name: [s.firstName, s.lastName].filter(Boolean).join(" "),
      grade: s.grade,
      schoolId: s.schoolId,
    })),
    schools,
    schoolYears: offeredSchoolYears(application.schoolYear),
    parent: {
      name: (profile?.displayName ?? profile?.fullName ?? parent.name).trim(),
      phone: profile?.phone ?? null,
      addressLines,
    },
    household,
    householdLastUpdated: lastUpdated?.toISOString() ?? null,
    window: window
      ? {
          schoolYear: window.schoolYear,
          closesAt: window.closesAt.toISOString(),
          closesAtLabel: formatWindowDate(window.closesAt),
          showClosingDate: windowState.showClosingDate,
          canSubmit: windowState.canSubmit,
          phase: windowState.phase,
        }
      : null,
    reviewerMessage: openRequest?.parentMessage ?? null,
    priorDenialMessage: priorDenial?.parentMessage ?? null,
    certifiedIncome: toCertifiedIncome(application.incomeSnapshot),
    missingImportedDocuments: missingImported.map((d) => d.fileName),
  };
}
