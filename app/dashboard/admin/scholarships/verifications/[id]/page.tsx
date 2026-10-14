import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { HoldToggle } from "@/components/dashboard/admin/eligibility/hold-toggle";
import { VerificationPanel } from "@/components/dashboard/admin/eligibility/verification-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { VERIFICATION_STATUS_LABEL } from "@/lib/eligibility/verifications-server";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/scholarship/capabilities";
import { getStaffActor } from "@/lib/scholarship/scope";
import { formatWindowDate } from "@/lib/scholarship/windows";
import { cn } from "@/lib/utils";
import { formatCalendarDate } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function VerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getStaffActor();
  if (!actor) {
    return (
      <>
        <AdminPageHeader title="Verification" />
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>Your account doesn&apos;t have review access.</AlertDescription>
        </Alert>
      </>
    );
  }

  const v = await prisma.studentVerification.findUnique({
    where: { id },
    include: {
      student: {
        select: { firstName: true, lastName: true, grade: true, birthDate: true, school: { select: { name: true } }, parentUserId: true },
      },
      documents: { orderBy: { uploadedAt: "asc" } },
      reviews: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!v) notFound();

  const peopleIds = [...new Set([v.claimedBy, v.decidedBy, v.student.parentUserId].filter(Boolean))] as string[];
  const people = await prisma.profile.findMany({
    where: { id: { in: peopleIds } },
    select: { id: true, displayName: true, fullName: true, email: true },
  });
  const nameOf = (pid: string | null) => {
    const p = people.find((x) => x.id === pid);
    return p ? p.displayName ?? p.fullName ?? p.email : null;
  };
  const studentName = [v.student.firstName, v.student.lastName].filter(Boolean).join(" ");
  const kind = v.kind === "displacement" ? "displacement" : "disability";

  return (
    <>
      <AdminPageHeader
        title={`${studentName} · ${kind === "displacement" ? "Displacement" : "Disability"} verification`}
        description={`${VERIFICATION_STATUS_LABEL[v.status] ?? v.status} · ${v.schoolYear === "K-12" ? "covers all of K-12 once approved" : v.schoolYear}`}
      />
      <div className="mb-4">
        <Link href="/dashboard/admin/scholarships" className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}>
          ← Review queue
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Student:</span> {studentName} · {v.student.grade ?? "grade not set"} ·{" "}
                {v.student.school?.name ?? "school not set"}
              </p>
              <p>
                <span className="text-muted-foreground">Parent:</span> {nameOf(v.student.parentUserId) ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">From:</span>{" "}
                {v.source === "application" ? (
                  v.sourceApplicationId ? (
                    <Link href={`/dashboard/admin/scholarships/${v.sourceApplicationId}`} className="text-primary underline-offset-4 hover:underline">
                      the scholarship application
                    </Link>
                  ) : (
                    "the scholarship application"
                  )
                ) : (
                  "the student profile"
                )}{" "}
                on {formatWindowDate(v.createdAt)}
              </p>
              {v.parentNote ? (
                <p>
                  <span className="text-muted-foreground">Family&apos;s note:</span> {v.parentNote}
                </p>
              ) : null}
              {kind === "displacement" ? (
                <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                  Displaced means placed in Arizona foster care under A.R.S. Title 8 at any time; out-of-state and
                  international placements and private adoptions don&apos;t qualify. Confirm with DCS using the signed
                  verification form. Court documents and case files should not be accepted.
                  {v.dcsSentAt ? ` Sent to DCS ${formatWindowDate(v.dcsSentAt)}.` : ""}
                  {v.dcsReference ? ` DCS reference ${v.dcsReference}.` : ""}
                </p>
              ) : null}
              {v.documentSummary ? (
                <p>
                  <span className="text-muted-foreground">Recorded finding:</span> {v.documentSummary}
                </p>
              ) : null}
              {v.parentMessage ? (
                <p>
                  <span className="text-muted-foreground">Last message to the family:</span> {v.parentMessage}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">Decision history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {v.reviews.map((r) => (
                <div key={r.id} className="border-b border-border/60 pb-2 last:border-0">
                  <p className="font-medium text-foreground">
                    {r.action.replace(/_/g, " ")} · {r.reviewerEmail ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatWindowDate(r.createdAt)}</p>
                  {r.parentMessage ? (
                    <p className="mt-1">
                      <span className="text-muted-foreground">To family: </span>
                      {r.parentMessage}
                    </p>
                  ) : null}
                  {r.internalNote ? (
                    <p className="mt-1 rounded-md bg-muted/60 p-2">
                      <span className="text-muted-foreground">Internal: </span>
                      {r.internalNote}
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <VerificationPanel
            verificationId={v.id}
            kind={kind}
            status={v.status}
            claimedByMe={Boolean(actor.profileId && v.claimedBy === actor.profileId)}
            claimedBy={v.claimedBy && v.claimedBy !== actor.profileId ? nameOf(v.claimedBy) : null}
            canDecide={can(actor.staffRole, "review.decide")}
            dcsReference={v.dcsReference}
          />

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {v.documents.length === 0 ? (
                <p className="text-muted-foreground">
                  Nothing uploaded yet. {kind === "displacement" ? "The family uploads the signed verification form." : "The family uploads the MET, IEP or 504 plan."}
                </p>
              ) : (
                v.documents.map((d) => (
                  <div key={d.id} className="space-y-1 border-b border-border/60 pb-2 last:border-0">
                    <p className="truncate font-medium text-foreground">{d.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.documentKind} · uploaded {formatWindowDate(d.uploadedAt)}
                      {d.purgedAt ? ` · deleted ${formatWindowDate(d.purgedAt)}` : d.legalHold ? " · on hold" : d.purgeAfter ? ` · kept until ${formatCalendarDate(d.purgeAfter)}` : " · kept until 4 years after the final payout year"}
                    </p>
                    {!d.purgedAt && can(actor.staffRole, "documents.view") ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <a href={`/api/scholarship/documents/${d.id}/view`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                          View document
                        </a>
                        <HoldToggle documentId={d.id} held={d.legalHold} />
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              <Badge variant="outline">Every open is logged</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
