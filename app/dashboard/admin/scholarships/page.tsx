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
import { formatWindowDate, formatWindowDateTime } from "@/lib/scholarship/windows";
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
  // Started but never submitted. Nothing to decide, but staff need to see who
  // stopped where, and the Schools counts include them.
  { id: "drafts", label: "Drafts", statuses: ["draft"] },
  { id: "all", label: "All", statuses: [...OPEN_STATUSES, "approved", "denied", "withdrawn", "draft"] },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Item types in the one review queue. Disability and displacement
 * verifications sit beside applications, labelled, so reviewers use one place
 * and one set of actions for all of it.
 */
const TYPES = [
  { id: "all", label: "All types" },
  { id: "application", label: "Scholarship applications" },
  { id: "disability", label: "Disability verifications" },
  { id: "displacement", label: "Displacement verifications" },
] as const;
type TypeId = (typeof TYPES)[number]["id"];

/** Verification statuses that belong under each status tab. */
const VERIFICATION_TAB_STATUSES: Record<TabId, string[]> = {
  open: ["pending_review", "awaiting_dcs", "info_requested"],
  approved: ["approved"],
  denied: ["denied"],
  withdrawn: ["withdrawn"],
  drafts: [],
  all: ["pending_review", "awaiting_dcs", "info_requested", "approved", "denied", "withdrawn"],
};

const VERIFICATION_STATUS_LABEL: Record<string, string> = {
  pending_review: "Under review",
  awaiting_dcs: "Sent to DCS",
  info_requested: "Awaiting information",
  approved: "Approved",
  denied: "Denied",
  withdrawn: "Withdrawn",
};

export default async function AdminScholarshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; school?: string }>;
}) {
  const { status: statusParam, type: typeParam, school: schoolParam } = await searchParams;
  const tab = TABS.find((t) => t.id === statusParam) ?? TABS[0];
  const type: TypeId = TYPES.find((t) => t.id === typeParam)?.id ?? "all";
  const showApplications = type === "all" || type === "application";
  const verificationKinds = type === "all" ? ["disability", "displacement"] : type === "application" ? [] : [type];
  const isOpenTab = tab.id === "open";
  const isDraftsTab = tab.id === "drafts";
  // From the Schools page: only this school's applications and students.
  const schoolFilter =
    schoolParam && /^[0-9a-f-]{36}$/i.test(schoolParam)
      ? await prisma.school.findUnique({ where: { id: schoolParam }, select: { id: true, name: true } })
      : null;
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
    where: schoolFilter ? { schoolId: schoolFilter.id } : {},
    _count: { _all: true },
  });
  const countFor = (id: TabId) => {
    const statuses = TABS.find((t) => t.id === id)!.statuses as readonly string[];
    return statusCounts.filter((c) => statuses.includes(c.status)).reduce((sum, c) => sum + c._count._all, 0);
  };

  const verifications = verificationKinds.length
    ? await prisma.studentVerification.findMany({
        where: {
          kind: { in: verificationKinds },
          status: { in: VERIFICATION_TAB_STATUSES[tab.id] },
          ...(schoolFilter ? { student: { schoolId: schoolFilter.id } } : {}),
        },
        orderBy: { createdAt: isOpenTab ? "asc" : "desc" },
        select: {
          id: true,
          kind: true,
          status: true,
          schoolYear: true,
          source: true,
          createdAt: true,
          decidedAt: true,
          claimedBy: true,
          student: { select: { firstName: true, lastName: true, school: { select: { name: true } } } },
          _count: { select: { documents: true } },
        },
      })
    : [];
  const openVerificationCount = await prisma.studentVerification.count({
    where: { status: { in: VERIFICATION_TAB_STATUSES.open } },
  });

  const applications = !showApplications ? [] : await prisma.scholarshipApplication.findMany({
    where: { status: { in: [...tab.statuses] }, ...(schoolFilter ? { schoolId: schoolFilter.id } : {}) },
    // The queue works oldest-first; decided lists read newest decision first;
    // drafts read most recently saved first.
    orderBy: isOpenTab
      ? [{ submittedAt: "asc" }]
      : isDraftsTab
        ? [{ updatedAt: "desc" }]
        : [{ reviewedAt: { sort: "desc", nulls: "last" } }, { submittedAt: "desc" }, { updatedAt: "desc" }],
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
      updatedAt: true,
      guardianUserId: true,
      schoolNameOther: true,
      student: { select: { firstName: true, lastName: true } },
      school: { select: { name: true } },
      documents: { where: { purgedAt: null }, select: { id: true, verifiedAt: true } },
    },
  });

  const reviewerIds = [
    ...new Set([...applications.map((a) => a.reviewedBy), ...verifications.map((v) => v.claimedBy)].filter(Boolean)),
  ] as string[];
  const reviewers = reviewerIds.length
    ? await prisma.profile.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, displayName: true, fullName: true, email: true },
      })
    : [];
  // The parent on each application, shown for drafts.
  const guardianIds = [...new Set(applications.map((a) => a.guardianUserId).filter(Boolean))] as string[];
  const guardians = guardianIds.length
    ? await prisma.profile.findMany({
        where: { id: { in: guardianIds } },
        select: { id: true, displayName: true, fullName: true, email: true },
      })
    : [];
  const parentLabel = (id: string | null) => {
    const g = id ? guardians.find((x) => x.id === id) : null;
    if (!g) return null;
    return [g.displayName ?? g.fullName, g.email].filter(Boolean).join(" · ");
  };

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
        description="Applications and disability or displacement verifications. Approve, deny, or ask a family for more information. Approval decides eligibility only; awards are made on Allocation."
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

      {schoolFilter ? (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">{schoolFilter.name}</Badge>
          <span className="text-muted-foreground">Showing this school only.</span>
          <Link
            href={"/dashboard/admin/scholarships" + (tab.id !== "open" ? "?status=" + tab.id : "")}
            className="text-primary underline-offset-4 hover:underline"
          >
            Show every school
          </Link>
        </p>
      ) : null}

      <nav className="mb-3 flex flex-wrap gap-2" aria-label="Item type">
        {TYPES.map((t) => {
          const query = new URLSearchParams();
          if (tab.id !== "open") query.set("status", tab.id);
          if (t.id !== "all") query.set("type", t.id);
          if (schoolFilter) query.set("school", schoolFilter.id);
          const qs = query.toString();
          return (
            <Link
              key={t.id}
              href={"/dashboard/admin/scholarships" + (qs ? "?" + qs : "")}
              aria-current={t.id === type ? "page" : undefined}
              className={cn(buttonVariants({ size: "sm", variant: t.id === type ? "secondary" : "ghost" }))}
            >
              {t.label}
            </Link>
          );
        })}
        {openVerificationCount > 0 ? (
          <span className="self-center text-xs text-muted-foreground">
            {openVerificationCount} open verification{openVerificationCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </nav>

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Application status">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={
              "/dashboard/admin/scholarships" +
              (() => {
                const query = new URLSearchParams();
                if (t.id !== "open") query.set("status", t.id);
                if (type !== "all") query.set("type", type);
                if (schoolFilter) query.set("school", schoolFilter.id);
                const qs = query.toString();
                return qs ? "?" + qs : "";
              })()
            }
            aria-current={t.id === tab.id ? "page" : undefined}
            className={cn(buttonVariants({ size: "sm", variant: t.id === tab.id ? "default" : "outline" }), "gap-1.5")}
          >
            {t.label}
            <span className="tabular-nums opacity-70">{countFor(t.id)}</span>
          </Link>
        ))}
      </nav>

      {verifications.length > 0 ? (
        <div className="mb-3 space-y-3">
          {verifications.map((v) => (
            <Card key={v.id} className="border-border/80">
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {[v.student.firstName, v.student.lastName].filter(Boolean).join(" ")}
                    </p>
                    <Badge className="border-0 bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100">
                      {v.kind === "disability" ? "Disability verification" : "Displacement verification"}
                    </Badge>
                    <Badge variant="secondary">{VERIFICATION_STATUS_LABEL[v.status] ?? v.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {v.schoolYear === "K-12" ? "All of K-12" : v.schoolYear} · {v.student.school?.name ?? "No school"} ·{" "}
                    from the {v.source === "application" ? "application" : "student profile"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested {formatWindowDate(v.createdAt)}
                    {v.decidedAt ? " · decided " + formatWindowDate(v.decidedAt) : ""}
                    {reviewerName(v.claimedBy) ? " · with " + reviewerName(v.claimedBy) : ""}
                    {" · "}
                    {v._count.documents} document{v._count.documents === 1 ? "" : "s"}
                  </p>
                </div>
                <Link
                  href={"/dashboard/admin/scholarships/verifications/" + v.id}
                  className={cn(buttonVariants({ size: "sm", variant: isOpenTab ? "default" : "outline" }))}
                >
                  {isOpenTab ? "Review" : "View"}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {applications.length === 0 && verifications.length === 0 ? (
        <Card className="border-border/80">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {isOpenTab
              ? "Nothing waiting for review."
              : isDraftsTab
                ? "No unsubmitted applications."
                : `No ${tab.label.toLowerCase()} applications.`}
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
                      <Badge variant="outline">Scholarship application</Badge>
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
                    {application.status === "draft" ? (
                      <p className="text-sm text-muted-foreground">
                        Parent: {parentLabel(application.guardianUserId) ?? "unknown"}
                      </p>
                    ) : null}
                    <p className="text-sm text-muted-foreground">
                      {application.schoolYear ?? "No school year"} ·{" "}
                      {application.school?.name ??
                        (application.schoolNameOther ? `${application.schoolNameOther} (typed)` : "No school")}{" "}
                      · {application.confirmationCode ?? "no code"}
                      {snapshot?.annual_total !== undefined
                        ? ` · household ${formatCurrency(snapshot.annual_total)}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {application.submittedAt
                        ? `Submitted ${formatWindowDate(application.submittedAt)}`
                        : `Not submitted · last saved ${formatWindowDateTime(application.updatedAt)}`}
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
