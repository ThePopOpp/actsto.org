import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { ReviewPanel } from "@/components/dashboard/admin/scholarship-review-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/scholarship/capabilities";
import {
  ATTEMPT_FLAG_THRESHOLD,
  APPLICATION_STEPS,
  overflowBySlug,
  STAFF_STATUS_LABEL,
} from "@/lib/scholarship/constants";
import { formatCurrency, readIncomeSnapshot } from "@/lib/scholarship/income";
import { getStaffActor } from "@/lib/scholarship/scope";
import { formatWindowDate } from "@/lib/scholarship/windows";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminScholarshipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getStaffActor();

  if (!actor) {
    return (
      <>
        <AdminPageHeader title="Application" />
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>Your account doesn&apos;t have review access.</AlertDescription>
        </Alert>
      </>
    );
  }

  const application = await prisma.scholarshipApplication.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, birthDate: true } },
      school: { select: { name: true, city: true } },
      documents: { orderBy: { uploadedAt: "asc" } },
      reviews: { orderBy: { createdAt: "desc" } },
      window: true,
    },
  });
  if (!application) notFound();

  const snapshot = readIncomeSnapshot(application.incomeSnapshot);
  const qualification = overflowBySlug(application.overflowQualification);

  // The full chain, so reviewing attempt 2 never happens without seeing why
  // attempt 1 was denied.
  const chain = await prisma.scholarshipApplication.findMany({
    where: {
      studentId: application.studentId,
      schoolYear: application.schoolYear,
      id: { not: application.id },
    },
    orderBy: { attemptNumber: "asc" },
    select: { id: true, attemptNumber: true, status: true, submittedAt: true },
  });

  const priorDenials = chain.length
    ? await prisma.applicationReview.findMany({
        where: { applicationId: { in: chain.map((c) => c.id) }, action: "deny" },
        orderBy: { createdAt: "desc" },
        select: { applicationId: true, parentMessage: true, createdAt: true },
      })
    : [];

  const reviewerIds = [...new Set(application.reviews.map((r) => r.reviewerId))];
  const reviewers = reviewerIds.length
    ? await prisma.profile.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, displayName: true, fullName: true, email: true },
      })
    : [];

  const guardian = application.guardianUserId
    ? await prisma.profile.findUnique({
        where: { id: application.guardianUserId },
        select: { displayName: true, fullName: true, email: true, phone: true },
      })
    : null;

  const eligibility = application.schoolYear
    ? await prisma.studentYearEligibility.findUnique({
        where: {
          studentId_schoolYear: {
            studentId: application.studentId,
            schoolYear: application.schoolYear,
          },
        },
      })
    : null;

  const studentName =
    [application.student.firstName, application.student.lastName].filter(Boolean).join(" ") ||
    "Student";

  return (
    <>
      <AdminPageHeader
        title={`${studentName} · ${application.schoolYear ?? "no year"}`}
        description={`${STAFF_STATUS_LABEL[application.status] ?? application.status}${application.confirmationCode ? ` · ${application.confirmationCode}` : ""}${application.attemptNumber > 1 ? ` · attempt ${application.attemptNumber}` : ""}`}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {application.attemptNumber >= ATTEMPT_FLAG_THRESHOLD ? (
          <Badge variant="outline">
            Attempt {application.attemptNumber} — reach out rather than reviewing again
          </Badge>
        ) : null}
        {application.esaCurrentYear === "yes" ? (
          <Badge variant="outline">ESA reported — any award is held pending documentation</Badge>
        ) : null}
        {application.infoNotReceived ? <Badge variant="outline">No reply received</Badge> : null}
        {eligibility?.revokedAt ? (
          <Badge variant="destructive">Eligibility revoked</Badge>
        ) : eligibility?.overflowEligible ? (
          <Badge variant="secondary">Overflow eligibility verified</Badge>
        ) : null}
      </div>

      {priorDenials.length > 0 ? (
        <Alert className="mb-6">
          <AlertTriangle className="size-4" />
          <AlertDescription className="space-y-2">
            <p className="font-medium text-foreground">
              A previous attempt for this student and year was denied.
            </p>
            {priorDenials.map((denial) => (
              <p key={denial.applicationId} className="text-sm">
                “{denial.parentMessage}” — {formatWindowDate(denial.createdAt)}{" "}
                <Link
                  href={`/dashboard/admin/scholarships/${denial.applicationId}`}
                  className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
                >
                  Open that attempt
                </Link>
              </p>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">Family and student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Student" value={studentName} />
              <Row label="Parent" value={guardian?.displayName ?? guardian?.fullName ?? null} />
              <Row label="Parent email" value={guardian?.email ?? null} />
              <Row label="Parent phone" value={guardian?.phone ?? null} />
              <Row label="School year" value={application.schoolYear} />
              <Row label="Grade" value={application.grade} />
              <Row
                label="School"
                value={
                  application.school
                    ? [application.school.name, application.school.city].filter(Boolean).join(" — ")
                    : null
                }
              />
              <Row
                label="Tuition after discounts"
                value={
                  application.tuitionAfterDiscounts === null
                    ? null
                    : formatCurrency(Number(application.tuitionAfterDiscounts), { cents: true })
                }
              />
              <Row
                label="Submitted"
                value={application.submittedAt ? formatWindowDate(application.submittedAt) : null}
              />
              <Row
                label="Income confirmed for this year"
                value={
                  application.incomeConfirmedAt
                    ? formatWindowDate(application.incomeConfirmedAt)
                    : null
                }
              />
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">
                Household income as certified
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!snapshot ? (
                <p className="text-sm text-muted-foreground">
                  No snapshot — this application hasn&apos;t been submitted yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th scope="col" className="py-2 font-medium">Member</th>
                        <th scope="col" className="py-2 text-right font-medium">Employment</th>
                        <th scope="col" className="py-2 text-right font-medium">Support</th>
                        <th scope="col" className="py-2 text-right font-medium">Retirement</th>
                        <th scope="col" className="py-2 text-right font-medium">Other</th>
                        <th scope="col" className="py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.members.map((member, index) => (
                        <tr key={`${member.full_name}-${index}`} className="border-b border-border/60">
                          <th scope="row" className="py-2 text-left font-normal text-foreground">
                            {member.full_name}
                            {member.role_label ? (
                              <span className="text-muted-foreground"> · {member.role_label}</span>
                            ) : null}
                          </th>
                          <td className="py-2 text-right tabular-nums">{formatCurrency(member.work.annual)}</td>
                          <td className="py-2 text-right tabular-nums">{formatCurrency(member.support.annual)}</td>
                          <td className="py-2 text-right tabular-nums">{formatCurrency(member.retirement.annual)}</td>
                          <td className="py-2 text-right tabular-nums">{formatCurrency(member.other.annual)}</td>
                          <td className="py-2 text-right font-medium tabular-nums">
                            {formatCurrency(member.annual_total)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border">
                        <th scope="row" colSpan={5} className="py-2 text-left font-medium text-foreground">
                          Household total ({snapshot.member_count}{" "}
                          {snapshot.member_count === 1 ? "person" : "people"})
                        </th>
                        <td className="py-2 text-right font-semibold tabular-nums">
                          {formatCurrency(snapshot.annual_total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Frozen at submission on {formatWindowDate(new Date(snapshot.captured_at))}. The
                    family may have edited their household since; this is what they certified.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">Narrative</CardTitle>
            </CardHeader>
            <CardContent>
              {application.narrative ? (
                <p className="whitespace-pre-wrap text-sm text-foreground">{application.narrative}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Not answered.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">
                Overflow qualification and ESA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Claimed qualification" value={qualification?.title ?? null} />
              <Row label="Documentation required" value={qualification?.needsDocs ? "Yes" : "No"} />
              {application.overflowOrg ? (
                <Row label="Awarding organization" value={application.overflowOrg} />
              ) : null}
              {application.overflowComments ? (
                <Row label="Family comments" value={application.overflowComments} />
              ) : null}
              <Row label="ESA this year" value={esaLabel(application.esaCurrentYear)} />
              <Row label="ESA prior year" value={esaLabel(application.esaPriorYear)} />
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">Decision history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {application.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
              ) : (
                application.reviews.map((review) => {
                  const reviewer = reviewers.find((r) => r.id === review.reviewerId);
                  return (
                    <div key={review.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-medium text-foreground">
                        {review.action.replace("_", " ")} ·{" "}
                        {reviewer?.displayName ?? reviewer?.fullName ?? reviewer?.email ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatWindowDate(review.createdAt)}
                        {review.dueAt ? ` · due ${formatWindowDate(review.dueAt)}` : ""}
                        {review.fieldsRequested.length > 0
                          ? ` · reopened ${review.fieldsRequested
                              .map((f) => APPLICATION_STEPS.find((s) => s.id === f)?.full ?? f)
                              .join(", ")}`
                          : ""}
                      </p>
                      {review.parentMessage ? (
                        <p className="mt-1 text-sm text-foreground">
                          <span className="text-muted-foreground">To family: </span>
                          {review.parentMessage}
                        </p>
                      ) : null}
                      {review.internalNote ? (
                        <p className="mt-1 rounded-md bg-muted/60 p-2 text-sm">
                          <span className="text-muted-foreground">Internal: </span>
                          {review.internalNote}
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <ReviewPanel
            applicationId={application.id}
            status={application.status}
            claimedBy={application.reviewedBy}
            actorProfileId={actor.profileId}
            needsInfoDueAt={application.needsInfoDueAt?.toISOString() ?? null}
            hasOverflowClaim={application.overflowQualification !== "none"}
            qualificationTitle={qualification?.title ?? null}
            documentCount={application.documents.filter((d) => !d.purgedAt).length}
            canDecide={can(actor.staffRole, "review.decide")}
            canReopen={can(actor.staffRole, "application.reopen")}
            locked={Boolean(application.lockedAt)}
          />

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {application.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing attached.</p>
              ) : (
                application.documents.map((document) => (
                  <div key={document.id} className="space-y-1 border-b border-border/60 pb-2 last:border-0">
                    <p className="truncate text-sm font-medium text-foreground">{document.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {document.documentKind} ·{" "}
                      {document.purgedAt
                        ? `deleted ${formatWindowDate(document.purgedAt)} under our retention policy`
                        : `kept until ${formatWindowDate(document.purgeAfter)}`}
                      {document.verifiedAt ? " · verified" : ""}
                    </p>
                    {!document.purgedAt && can(actor.staffRole, "documents.view") ? (
                      <Link
                        href={`/api/scholarship/documents/${document.id}/url`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get a link
                      </Link>
                    ) : null}
                  </div>
                ))
              )}
              {!can(actor.staffRole, "documents.view") ? (
                <p className="text-xs text-muted-foreground">
                  Your account can see that documents exist but can&apos;t open them.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {chain.length > 0 ? (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="font-heading text-base text-primary">
                  Other attempts this year
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {chain.map((attempt) => (
                  <Link
                    key={attempt.id}
                    href={`/dashboard/admin/scholarships/${attempt.id}`}
                    className="block text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Attempt {attempt.attemptNumber} ·{" "}
                    {STAFF_STATUS_LABEL[attempt.status] ?? attempt.status}
                  </Link>
                ))}
                <p className="text-xs text-muted-foreground">
                  Outcomes are counted once per student and year, not once per attempt.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function esaLabel(value: string | null): string | null {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "unsure") return "Not sure yet";
  return null;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-2 last:border-0 sm:grid-cols-[200px_1fr] sm:gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={value ? "text-foreground" : "text-muted-foreground"}>
        {value || "Not answered"}
      </span>
    </div>
  );
}
