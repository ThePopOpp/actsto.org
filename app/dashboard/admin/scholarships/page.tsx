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

/**
 * Tabs over the application list. Decided applications used to drop out of
 * the page entirely, so once approved there was no way to find one again.
 */
const TABS = [
  { id: "open", label: "Open", statuses: [...OPEN_STATUSES] },
  { id: "approved", label: "Approved", statuses: ["approved"] },
  { id: "denied", label: "Denied", statuses: ["denied"] },
  { id: "withdrawn", label: "Withdrawn", statuses: ["withdrawn"] },
  { id: "all", label: "All", statuses: [...OPEN_STATUSES, "approved", "denied", "withdrawn"] },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function AdminScholarshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const tab = TABS.find((t) => t.id === statusParam) ?? TABS[0];
  const isOpenTab = tab.id === "open";
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

  const statusCounts = await prisma.scholarshipApplication.groupBy({
    by: ["status"],
    where: { status: { not: "draft" } },
    _count: { _all: true },
  });
  const countFor = (id: TabId) => {
    const statuses = TABS.find((t) => t.id === id)!.statuses as readonly string[];
    return statusCounts.filter((c) => statuses.includes(c.status)).reduce((sum, c) => sum + c._count._all, 0);
  };

  const applications = await prisma.scholarshipApplication.findMany({
    where: { status: { in: [...tab.statuses] } },
    // The queue works oldest-first; decided lists read newest decision first.
    orderBy: isOpenTab ? [{ submittedAt: "asc" }] : [{ reviewedAt: { sort: "desc", nulls: "last" } }, { submittedAt: "desc" }],
    select: {
      id: true,
      status: true,
      schoolYear: true,
      confirmationCode: true,
      submittedAt: true,
      reviewedAt: true,
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

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Application status">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "open" ? "/dashboard/admin/scholarships" : `/dashboard/admin/scholarships?status=${t.id}`}
            aria-current={t.id === tab.id ? "page" : undefined}
            className={cn(buttonVariants({ size: "sm", variant: t.id === tab.id ? "default" : "outline" }), "gap-1.5")}
          >
            {t.label}
            <span className="tabular-nums opacity-70">{countFor(t.id)}</span>
          </Link>
        ))}
      </nav>

      {applications.length === 0 ? (
        <Card className="border-border/80">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {isOpenTab ? "Nothing waiting for review." : `No ${tab.label.toLowerCase()} applications.`}
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
                      {!OPEN_STATUSES.includes(application.status as (typeof OPEN_STATUSES)[number]) && application.reviewedAt
                        ? ` · decided ${formatWindowDate(application.reviewedAt)}`
                        : ""}
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
                    className={cn(buttonVariants({ size: "sm", variant: OPEN_STATUSES.includes(application.status as (typeof OPEN_STATUSES)[number]) ? "default" : "outline" }))}
                  >
                    {OPEN_STATUSES.includes(application.status as (typeof OPEN_STATUSES)[number]) ? "Review" : "View"}
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
