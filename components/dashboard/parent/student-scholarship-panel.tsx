import { StudentVerificationRequest } from "@/components/dashboard/parent/student-verification-request";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentAwardSummary } from "@/lib/allocation/server";
import { FLAG_PARENT_LABEL, FLAG_STATUS_LABEL, isEligibilityFlag, isFlagStatus } from "@/lib/eligibility/flags";
import { isK12 } from "@/lib/grades";

export type StudentScholarshipInfo = {
  id: string;
  name: string;
  grade: string | null;
  flags: { flag: string; schoolYear: string; status: string; reason: string | null }[];
  /** School years with an approved application: eligible for the Original scholarship. */
  approvedYears: string[];
  verifications: { id: string; kind: "disability" | "displacement"; status: string; schoolYear: string; parentMessage: string | null }[];
  awards: StudentAwardSummary[];
};

function usd(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

const OPEN = ["pending_review", "awaiting_dcs", "info_requested"];

/**
 * Per student: what has been awarded and sent to the school (spec #5), and
 * disability/displacement status with a way to ask for verification (spec #4).
 * Parents see only their own children — the page only loads those.
 */
export function StudentScholarshipPanel({
  students,
  displacedDefinition,
}: {
  students: StudentScholarshipInfo[];
  displacedDefinition: string;
}) {
  if (students.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-xl font-semibold text-primary">Scholarships and eligibility</h2>
      {students.map((s) => {
        const verification = (kind: "disability" | "displacement") =>
          s.verifications.find((v) => v.kind === kind && (OPEN.includes(v.status) || v.status === "approved")) ??
          s.verifications.find((v) => v.kind === kind) ??
          null;
        const dis = verification("disability");
        const disp = verification("displacement");
        const approvedFlags = s.flags.filter((f) => f.status === "approved");
        return (
          <Card key={s.id} className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg text-primary">{s.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              {/* Awards: what was awarded, what was sent to the school and when. */}
              {s.awards.length === 0 ? (
                <p className="text-muted-foreground">
                  No scholarship awarded yet. Approval of an application decides eligibility; awards are decided
                  separately, and you&apos;ll get an email when one is made.
                </p>
              ) : (
                s.awards.map((year) => (
                  <div key={year.schoolYear} className="space-y-2 rounded-lg border border-border/60 p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-foreground">{year.schoolYear}</p>
                      <p className="tabular-nums text-muted-foreground">
                        Awarded {usd(year.awarded)} · sent to school {usd(year.sent)} · still to send {usd(year.remaining)}
                      </p>
                    </div>
                    <ul className="space-y-1">
                      {year.lines.map((line) => (
                        <li key={line.awardId} className="flex flex-wrap items-center gap-2">
                          <span>{line.program}</span>
                          <span className="tabular-nums">{usd(line.amount)}</span>
                          <Badge variant={line.status === "Fully sent to school" ? "secondary" : "outline"}>{line.status}</Badge>
                          {line.payments.length ? (
                            <span className="text-xs text-muted-foreground">
                              {line.payments.map((p) => `${usd(p.amount)} on ${p.date}`).join(", ")}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {year.lines.some((l) => l.status.startsWith("Awarded, held")) ? (
                      <p className="text-xs text-muted-foreground">
                        Held because an ESA contract was reported for this year. State law bars sending tax-credit money
                        while an ESA contract is in place. Send us the Department of Education notice that it closed or
                        lapsed, and we&apos;ll release it.
                      </p>
                    ) : null}
                  </div>
                ))
              )}

              {/* Every program the student qualifies for: Original from an
                  approved application, the others from approved flags. */}
              {s.approvedYears.length || approvedFlags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {s.approvedYears.map((year) => (
                    <Badge key={`original-${year}`} variant="secondary">
                      Eligible: Original scholarship · {year}
                    </Badge>
                  ))}
                  {approvedFlags.map((f) => (
                    <Badge key={f.flag + f.schoolYear} variant="secondary">
                      {isEligibilityFlag(f.flag) ? FLAG_PARENT_LABEL[f.flag] : f.flag}
                      {f.schoolYear !== "K-12" ? ` · ${f.schoolYear}` : ""}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium text-foreground">Disability</p>
                  {dis ? (
                    <p className="mt-1 text-muted-foreground">
                      {isFlagStatus(dis.status) ? FLAG_STATUS_LABEL[dis.status] : dis.status === "withdrawn" ? "Withdrawn" : dis.status}
                      {dis.schoolYear !== "K-12" ? ` · ${dis.schoolYear}` : ""}
                      {dis.parentMessage && (dis.status === "denied" || dis.status === "info_requested") ? (
                        <span className="block text-foreground">{dis.parentMessage}</span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">Not on file.</p>
                  )}
                  <div className="mt-2">
                    {dis && OPEN.includes(dis.status) ? (
                      <StudentVerificationRequest
                        studentId={s.id}
                        studentName={s.name}
                        kind="disability"
                        displacedDefinition={displacedDefinition}
                        existingVerificationId={dis.id}
                        label="Upload a document"
                      />
                    ) : dis?.status !== "approved" ? (
                      <StudentVerificationRequest
                        studentId={s.id}
                        studentName={s.name}
                        kind="disability"
                        displacedDefinition={displacedDefinition}
                        label="Tell us about a disability"
                      />
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium text-foreground">Displaced student</p>
                  {!isK12(s.grade) && s.grade ? (
                    <p className="mt-1 text-muted-foreground">Applies from Kindergarten through 12th grade.</p>
                  ) : disp ? (
                    <p className="mt-1 text-muted-foreground">
                      {isFlagStatus(disp.status) ? FLAG_STATUS_LABEL[disp.status] : disp.status === "withdrawn" ? "Withdrawn" : disp.status}
                      {disp.status === "approved" ? " · lasts through 12th grade" : ""}
                      {disp.parentMessage && (disp.status === "denied" || disp.status === "info_requested") ? (
                        <span className="block text-foreground">{disp.parentMessage}</span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">Not on file.</p>
                  )}
                  {isK12(s.grade) || !s.grade ? (
                    <div className="mt-2">
                      {disp && OPEN.includes(disp.status) ? (
                        <StudentVerificationRequest
                          studentId={s.id}
                          studentName={s.name}
                          kind="displacement"
                          displacedDefinition={displacedDefinition}
                          existingVerificationId={disp.id}
                          label="Upload the signed form"
                        />
                      ) : disp?.status !== "approved" ? (
                        <StudentVerificationRequest
                          studentId={s.id}
                          studentName={s.name}
                          kind="displacement"
                          displacedDefinition={displacedDefinition}
                          label="Tell us about displacement"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
