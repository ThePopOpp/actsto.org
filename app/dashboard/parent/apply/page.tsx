import { AlertTriangle, CalendarClock, FileText, Lock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StartApplicationForm } from "@/components/dashboard/scholarship/start-application-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { prisma } from "@/lib/prisma";
import { PARENT_STATUS_LABEL } from "@/lib/scholarship/constants";
import { getParentActor, parentApplicationWhere, parentStudentWhere } from "@/lib/scholarship/scope";
import { offeredSchoolYears } from "@/lib/scholarship/wizard-data";
import {
  formatWindowDate,
  getActiveWindow,
  getNextWindow,
  resolveWindowState,
} from "@/lib/scholarship/windows";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Apply for a scholarship",
};

/**
 * Wizard entry point.
 *
 * Everything the window state changes about the parent's experience is decided
 * here, once, rather than being checked again inside each step.
 */
export default async function ApplyPage() {
  const parent = await getParentActor();
  if (!parent) redirect("/login?role=parent&next=/dashboard/parent/apply");

  const [students, applications, activeWindow] = await Promise.all([
    prisma.student.findMany({
      where: parentStudentWhere(parent.profileId),
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, grade: true },
    }),
    prisma.scholarshipApplication.findMany({
      where: parentApplicationWhere(parent.profileId),
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        status: true,
        schoolYear: true,
        confirmationCode: true,
        attemptNumber: true,
        updatedAt: true,
        needsInfoDueAt: true,
        student: { select: { firstName: true, lastName: true } },
      },
    }),
    getActiveWindow(),
  ]);

  const windowState = resolveWindowState(activeWindow);
  const nextWindow = windowState.canStart ? null : await getNextWindow();

  const live = applications.filter((a) => !["denied", "withdrawn"].includes(a.status));
  const closed = applications.filter((a) => ["denied", "withdrawn"].includes(a.status));

  // A student with a live application this year can't start a second one — the
  // partial unique index enforces it, and hiding them here avoids offering a
  // choice the server would reject.
  const takenStudentIds = new Set(
    (
      await prisma.scholarshipApplication.findMany({
        where: {
          ...parentApplicationWhere(parent.profileId),
          schoolYear: activeWindow?.schoolYear ?? "",
          status: { notIn: ["denied", "withdrawn"] },
        },
        select: { studentId: true },
      })
    ).map((a) => a.studentId),
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Scholarship
        </p>
        <h1 className="font-heading text-2xl font-semibold text-primary">
          {activeWindow ? `Apply for the ${activeWindow.schoolYear} year` : "Apply for a scholarship"}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          One application per student, per school year. Your answers save as you go, so you can
          leave and come back.
        </p>
      </header>

      <WindowNotice
        phase={windowState.phase}
        window={activeWindow}
        showClosingDate={windowState.showClosingDate}
        nextOpensAt={nextWindow?.opensAt ?? null}
        hasDraft={live.some((a) => a.status === "draft")}
      />

      {live.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-primary">Your applications</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {live.map((application) => (
              <Card key={application.id} className="border-border/80">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-heading text-base text-primary">
                      {[application.student.firstName, application.student.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    </CardTitle>
                    <Badge variant={application.status === "draft" ? "outline" : "secondary"}>
                      {PARENT_STATUS_LABEL[application.status] ?? application.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {application.schoolYear ?? "No school year yet"}
                    {application.attemptNumber > 1 ? ` · attempt ${application.attemptNumber}` : ""}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {application.confirmationCode ? (
                    <p className="text-xs text-muted-foreground">
                      Confirmation code{" "}
                      <span className="font-medium tabular-nums text-foreground">
                        {application.confirmationCode}
                      </span>
                    </p>
                  ) : null}
                  {application.needsInfoDueAt ? (
                    <p className="text-sm font-medium text-foreground">
                      Please respond by {formatWindowDate(application.needsInfoDueAt)}
                    </p>
                  ) : null}
                  <Link
                    href={`/dashboard/parent/apply/${application.id}`}
                    className={cn(buttonVariants({ size: "sm", variant: application.status === "draft" ? "default" : "outline" }))}
                  >
                    {application.status === "draft"
                      ? "Continue your application"
                      : application.status === "needs_info"
                        ? "Respond to our team"
                        : "View application"}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {windowState.canStart && activeWindow ? (
        <StartApplicationForm
          students={students
            .filter((s) => !takenStudentIds.has(s.id))
            .map((s) => ({
              id: s.id,
              name: [s.firstName, s.lastName].filter(Boolean).join(" "),
              grade: s.grade,
              schoolId: null,
            }))}
          schoolYears={offeredSchoolYears(activeWindow.schoolYear)}
          defaultSchoolYear={activeWindow.schoolYear}
          allStudentsApplied={students.length > 0 && students.every((s) => takenStudentIds.has(s.id))}
        />
      ) : null}

      {closed.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-primary">Past applications</h2>
          <div className="space-y-2">
            {closed.map((application) => (
              <Card key={application.id} className="border-border/80">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {[application.student.firstName, application.student.lastName]
                        .filter(Boolean)
                        .join(" ")}{" "}
                      · {application.schoolYear}
                    </p>
                    <p className="text-muted-foreground">
                      {PARENT_STATUS_LABEL[application.status] ?? application.status}
                      {application.attemptNumber > 1 ? ` · attempt ${application.attemptNumber}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/parent/apply/${application.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    View
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {students.length === 0 ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Add a student first</AlertTitle>
          <AlertDescription>
            An application belongs to one student. Add your child to your account, then come back
            here.{" "}
            <Link
              href="/dashboard/parent/students"
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
            >
              Manage students
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function WindowNotice({
  phase,
  window,
  showClosingDate,
  nextOpensAt,
  hasDraft,
}: {
  phase: string;
  window: { schoolYear: string; opensAt: Date; closesAt: Date; lateGraceUntil: Date | null } | null;
  showClosingDate: boolean;
  nextOpensAt: Date | null;
  hasDraft: boolean;
}) {
  if (phase === "open" && window) {
    // Inside 30 days only, and as a date rather than a countdown timer — this
    // is a scholarship application, not a flash sale.
    if (!showClosingDate) return null;
    return (
      <Alert>
        <CalendarClock className="size-4" />
        <AlertDescription>
          Applications for {window.schoolYear} close on {formatWindowDate(window.closesAt)}.
        </AlertDescription>
      </Alert>
    );
  }

  if (phase === "upcoming" && window) {
    return (
      <Alert>
        <CalendarClock className="size-4" />
        <AlertTitle>Applications open on {formatWindowDate(window.opensAt)}</AlertTitle>
        <AlertDescription>
          Applications for the {window.schoolYear} school year aren&apos;t open yet. You can look
          around now, and we&apos;ll email you when the window opens.
        </AlertDescription>
      </Alert>
    );
  }

  if (phase === "grace" && window) {
    return (
      <Alert>
        <AlertTriangle className="size-4" />
        <AlertTitle>You&apos;re submitting after the deadline</AlertTitle>
        <AlertDescription>
          Applications for {window.schoolYear} closed on {formatWindowDate(window.closesAt)}. We&apos;re
          still accepting applications that were already started, until{" "}
          {window.lateGraceUntil ? formatWindowDate(window.lateGraceUntil) : "further notice"}.
        </AlertDescription>
      </Alert>
    );
  }

  if (phase === "closed" || phase === "none") {
    return (
      <Alert>
        <Lock className="size-4" />
        <AlertTitle>Applications are closed right now</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            {window
              ? `Applications for ${window.schoolYear} closed on ${formatWindowDate(window.closesAt)}.`
              : "There's no open application window at the moment."}
            {nextOpensAt ? ` The next window opens on ${formatWindowDate(nextOpensAt)}.` : ""}
          </p>
          {hasDraft ? (
            <p className="flex items-start gap-2">
              <FileText className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Your unfinished application is saved and hasn&apos;t been deleted. Contact our team
                if you need to submit it late.
              </span>
            </p>
          ) : null}
          <p>
            <Link
              href="/contact"
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
            >
              Contact our team about an exception
            </Link>
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
