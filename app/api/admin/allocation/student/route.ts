import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { payableRoom } from "@/lib/allocation/rules";
import { netPaid, studentEligibility, studentYearMoney } from "@/lib/allocation/server";
import { getDecisions, needAssessmentFor } from "@/lib/award-policy/decisions-server";
import { otherStoTotals } from "@/lib/award-policy/limits-server";
import { priorityFactors } from "@/lib/award-policy/priority-server";
import { FUNDING_SOURCE_LABEL, isFundingSource } from "@/lib/funding-sources";
import { prisma } from "@/lib/prisma";
import { isoDateInArizona } from "@/lib/format-date";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/allocation/student?studentId=&year=
 *
 * One student's year: eligibility, limits (tuition, the all-STO disabled/
 * displaced cap from the state aid matrix, other STOs' scholarships), ESA
 * status, awards with their payments, returns and decision records, priority
 * factors and narrative, and donor recommendations as context only.
 */
export async function GET(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId") ?? "";
    const year = url.searchParams.get("year") ?? "";
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true, school: { select: { name: true } } },
    });
    if (!student || !year) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    const [eligibility, money, limits, awards, recommendations, other, esa, application, priority, waiting, need] = await Promise.all([
      studentEligibility(studentId, year),
      studentYearMoney(studentId, year),
      prisma.studentYearLimit.findUnique({ where: { studentId_schoolYear: { studentId, schoolYear: year } } }),
      prisma.scholarshipAward.findMany({
        where: { studentId, schoolYear: year },
        orderBy: { createdAt: "asc" },
        include: {
          campaign: { select: { title: true } },
          payments: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.donorRecommendedStudent.findMany({
        where: { studentId, donation: { status: "paid" } },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          donation: {
            select: {
              createdAt: true,
              amount: true,
              campaign: { select: { title: true } },
              donationDetail: { select: { donorFirstName: true, donorLastName: true } },
            },
          },
        },
      }),
      otherStoTotals(studentId, year),
      prisma.studentEsaStatus.findUnique({ where: { studentId_schoolYear: { studentId, schoolYear: year } } }),
      prisma.scholarshipApplication.findFirst({
        where: { studentId, schoolYear: year, status: { notIn: ["withdrawn"] } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          narrative: true,
          otherStoAnswer: true,
          esaCurrentYear: true,
          documents: { where: { documentKind: "esa_closure", purgedAt: null }, select: { id: true, fileName: true, uploadedAt: true } },
        },
      }),
      priorityFactors([studentId], year),
      prisma.overflowWaitingListEntry.findFirst({ where: { studentId, removedAt: null }, select: { addedOn: true, note: true } }),
      needAssessmentFor(studentId, year),
    ]);

    const decisions = await getDecisions(Array.from(new Set(awards.map((a) => a.decisionId).filter((id): id is string => Boolean(id)))));

    return NextResponse.json({
      student: {
        id: student.id,
        name: [student.firstName, student.lastName].filter(Boolean).join(" "),
        school: student.school?.name ?? null,
        grade: money.grade,
      },
      viewerId: auth.actor.id,
      eligibility,
      money,
      needAssessment: need,
      limits: {
        tuitionCeiling: limits?.tuitionCeiling != null ? Number(limits.tuitionCeiling) : null,
        tuitionReason: limits?.tuitionReason ?? null,
        ddCapOverride: limits?.ddCapIsOverride && limits.ddCap != null ? Number(limits.ddCap) : null,
        ddCapReason: limits?.ddCapIsOverride ? limits.ddCapReason : null,
      },
      otherSto: { ...other, answer: application?.otherStoAnswer ?? null },
      esa: {
        status: esa?.status ?? null,
        closedOn: esa?.closedOn ? esa.closedOn.toISOString().slice(0, 10) : null,
        note: esa?.note ?? null,
        source: esa?.source ?? null,
        closureDocumentId: esa?.closureDocumentId ?? null,
        applicationAnswer: application?.esaCurrentYear ?? null,
        closureDocuments: (application?.documents ?? []).map((d) => ({ id: d.id, fileName: d.fileName, uploadedOn: isoDateInArizona(d.uploadedAt) })),
      },
      priority: priority.get(studentId) ?? null,
      narrative: application?.narrative ?? null,
      waitingList: waiting ? { addedOn: isoDateInArizona(waiting.addedOn), note: waiting.note } : null,
      decisions,
      awards: awards.map((award) => {
        const source = isFundingSource(award.fundingSource) ? award.fundingSource : "unrestricted";
        const sentHere = award.payments.filter((p) => p.status === "sent").reduce((s, p) => s + netPaid(p), 0);
        const unsent = Number(award.awardAmount) - sentHere;
        return {
          id: award.id,
          decisionId: award.decisionId,
          fundingSource: source,
          fundingLabel: FUNDING_SOURCE_LABEL[source],
          amount: Number(award.awardAmount),
          status: award.status,
          heldReason: award.heldReason,
          reversalReason: award.reversalReason,
          reversedAt: award.reversedAt ? isoDateInArizona(award.reversedAt) : null,
          reversedByEmail: award.reversedByEmail,
          note: award.note,
          campaignTitle: award.campaign?.title ?? null,
          campaignKey: award.campaignId ?? (award.drawsFromGeneral ? "general" : null),
          allocationGroupId: award.allocationGroupId,
          createdAt: award.createdAt.toISOString(),
          createdByEmail: award.createdByEmail,
          sent: Math.round(sentHere * 100) / 100,
          // What could still go to the school under tuition and caps, counting
          // other STOs; the rest is "awarded, not payable".
          payable:
            award.status === "reversed"
              ? 0
              : payableRoom({
                  fundingSource: source,
                  awardUnsent: unsent,
                  sentAllFunds: money.sentAllFunds,
                  sentThisFund: money.sentBySource[source] ?? 0,
                  tuitionCeiling: money.tuitionCeiling,
                  lowIncomeCap: money.lowIncomeCap,
                  ddCap: money.ddCap,
                  otherStoAll: money.otherStoAll,
                  otherStoDisabledDisplaced: money.otherStoDisabledDisplaced,
                }),
          payments: award.payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            returned: Number(p.returnedAmount),
            returnNote: p.returnNote,
            paidAt: isoDateInArizona(p.paidAt ?? p.createdAt),
            reference: p.paymentReference,
            status: p.status,
            voidReason: p.voidReason,
            tuitionOverrideReason: p.tuitionOverrideReason,
          })),
        };
      }),
      recommendations: recommendations.map((r) => ({
        date: isoDateInArizona(r.donation.createdAt),
        amount: Number(r.donation.amount),
        campaign: r.donation.campaign?.title ?? null,
        donor:
          [r.donation.donationDetail?.donorFirstName, r.donation.donationDetail?.donorLastName].filter(Boolean).join(" ") ||
          "A donor",
      })),
    });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
