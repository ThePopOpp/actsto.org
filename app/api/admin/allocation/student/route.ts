import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { payableRoom } from "@/lib/allocation/rules";
import { studentEligibility, studentYearMoney } from "@/lib/allocation/server";
import { FUNDING_SOURCE_LABEL, isFundingSource } from "@/lib/funding-sources";
import { prisma } from "@/lib/prisma";
import { isoDateInArizona } from "@/lib/format-date";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/allocation/student?studentId=&year=
 *
 * One student's year: eligibility, limits, awards with their payments and how
 * much of each can still be paid, and donor recommendations as context only.
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

    const [eligibility, money, limits, awards, recommendations] = await Promise.all([
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
    ]);

    return NextResponse.json({
      student: {
        id: student.id,
        name: [student.firstName, student.lastName].filter(Boolean).join(" "),
        school: student.school?.name ?? null,
        grade: money.grade,
      },
      eligibility,
      money,
      limits: {
        tuitionCeiling: limits?.tuitionCeiling != null ? Number(limits.tuitionCeiling) : null,
        tuitionReason: limits?.tuitionReason ?? null,
        ddCap: limits?.ddCap != null ? Number(limits.ddCap) : null,
        ddCapReason: limits?.ddCapReason ?? null,
      },
      awards: awards.map((award) => {
        const source = isFundingSource(award.fundingSource) ? award.fundingSource : "unrestricted";
        const sentHere = award.payments.filter((p) => p.status === "sent").reduce((s, p) => s + Number(p.amount), 0);
        const unsent = Number(award.awardAmount) - sentHere;
        return {
          id: award.id,
          fundingSource: source,
          fundingLabel: FUNDING_SOURCE_LABEL[source],
          amount: Number(award.awardAmount),
          status: award.status,
          heldReason: award.heldReason,
          reversalReason: award.reversalReason,
          note: award.note,
          campaignTitle: award.campaign?.title ?? null,
          campaignKey: award.campaignId ?? (award.drawsFromGeneral ? "general" : null),
          allocationGroupId: award.allocationGroupId,
          createdAt: award.createdAt.toISOString(),
          createdByEmail: award.createdByEmail,
          sent: sentHere,
          // What could still go to the school under tuition and caps; the rest
          // is "awarded, not payable".
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
                }),
          payments: award.payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            paidAt: isoDateInArizona(p.paidAt ?? p.createdAt),
            reference: p.paymentReference,
            status: p.status,
            voidReason: p.voidReason,
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
