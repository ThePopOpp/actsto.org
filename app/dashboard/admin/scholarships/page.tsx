import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { prisma } from "@/lib/prisma";
import { ATTEMPT_FLAG_THRESHOLD, STAFF_STATUS_LABEL } from "@/lib/scholarship/constants";
import { formatCurrency } from "@/lib/scholarship/income";
import { getStaffActor } from "@/lib/scholarship/scope";
import { formatWindowDate } from "@/lib/scholarship/windows";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["submitted", "under_review", "needs_info"] as const;

export default async function AdminScholarshipsPage() {
  const actor = await getStaffActor();
  if (!actor) {
    return (
      <>
        <AdminPageHeader title="Scholarship applications" />
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>Your account doesn&apos;t have review access.</AlertDescription>
        </Alert>
      </>
    );
  }

  const applications = await prisma.scholarshipApplication.findMany({
    where: { status: { in: [...OPEN_STATUSES] } },
    orderBy: [{ submittedAt: "asc" }],
    select: {
      id: true,
      status: true,
      schoolYear: true,
      confirmationCode: true,
      submittedAt: true,
      attemptNumber: true,
      needsInfoDueAt: true,
      infoNotReceived: true,
      esaCurrentYear: true,
      overflowQualification: true,
      incomeSnapshot: true,
      reviewedBy: true,
      student: { select: { firstName: true, lastName: true } },
      school: { select: { name: true } },
      documents: { where: { purgedAt: null }, select: { id: true, verifiedAt: true } },
    },
  });

  const reviewerIds = [...new Set(applications.map((a) => a.reviewedBy).filter(Boolean))] as string[];
  const reviewers = reviewerIds.length
    ? await prisma.profile.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, displayName: true, fullName: true, email: true },
      })
    : [];
  const reviewerName = (id: string | null) => {
    if (!id) return null;
    const r = reviewers.find((x) => x.id === id);
    return r?.displayName ?? r?.fullName ?? r?.email ?? null;
  };

  const now = new Date();
  const stale = applications.filter(
    (a) => a.status === "needs_info" && a.needsInfoDueAt && a.needsInfoDueAt < now,
  );

  return (
    <>
      <AdminPageHeader
        title="Scholarship applications"
        description="Approve, deny, or ask a family for more information. Approval decides eligibility only — awarding happens separately."
      />

      {stale.length > 0 ? (
        <Alert className="mb-6">
          <Clock className="size-4" />
          <AlertDescription>
            {stale.length} {stale.length === 1 ? "application has" : "applications have"} passed the
            information deadline with no reply. They stay in the queue for a person to decide —
            nothing is auto-denied.
          </AlertDescription>
        </Alert>
      ) : null}

      {applications.length === 0 ? (
        <Card className="border-border/80">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nothing waiting for review.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((application) => {
            const snapshot = application.incomeSnapshot as { annual_total?: number } | null;
            const overdue =
              application.status === "needs_info" &&
              application.needsInfoDueAt &&
              application.needsInfoDueAt < now;

            return (
              <Card key={application.id} className="border-border/80">
                <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {[application.student.firstName, application.student.lastName]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                      <Badge variant="secondary">
                        {STAFF_STATUS_LABEL[application.status] ?? application.status}
                      </Badge>
                      {/* Soft flags — they route a family to staff, they never block. */}
                      {application.attemptNumber >= ATTEMPT_FLAG_THRESHOLD ? (
                        <Badge variant="outline">Attempt {application.attemptNumber} — worth a call</Badge>
                      ) : null}
                      {application.esaCurrentYear === "yes" ? (
                        <Badge variant="outline">ESA — award would be held</Badge>
                      ) : null}
                      {application.infoNotReceived ? (
                        <Badge variant="outline">No reply received</Badge>
                      ) : null}
                      {overdue ? <Badge variant="outline">Past deadline</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {application.schoolYear} · {application.school?.name ?? "No school"} ·{" "}
                      {application.confirmationCode ?? "no code"}
                      {snapshot?.annual_total !== undefined
                        ? ` · household ${formatCurrency(snapshot.annual_total)}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {application.submittedAt
                        ? `Submitted ${formatWindowDate(application.submittedAt)}`
                        : "Not submitted"}
                      {application.needsInfoDueAt
                        ? ` · reply due ${formatWindowDate(application.needsInfoDueAt)}`
                        : ""}
                      {reviewerName(application.reviewedBy)
                        ? ` · with ${reviewerName(application.reviewedBy)}`
                        : ""}
                      {application.documents.length > 0
                        ? ` · ${application.documents.length} document${application.documents.length === 1 ? "" : "s"}`
                        : application.overflowQualification !== "none"
                          ? " · no documents attached"
                          : ""}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/admin/scholarships/${application.id}`}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    Review
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
