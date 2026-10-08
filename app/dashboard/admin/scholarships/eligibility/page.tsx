import Link from "next/link";
import { Download } from "lucide-react";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { FixGradeControl, OverrideFlagButton } from "@/components/dashboard/admin/eligibility/eligibility-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ELIGIBILITY_FLAGS,
  FLAG_LABEL,
  FLAG_STATUS_LABEL,
  FLAG_STATUSES,
  isEligibilityFlag,
  isFlagStatus,
} from "@/lib/eligibility/flags";
import { gradesNeedingReview, listEligibility } from "@/lib/eligibility/list-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function detailText(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const calc = (details as { calculation?: { householdSize?: number; annualIncome?: number; limit?: number } }).calculation;
  if (calc && typeof calc.limit === "number") {
    return `Household of ${calc.householdSize}, income $${(calc.annualIncome ?? 0).toLocaleString()} against a $${calc.limit.toLocaleString()} limit`;
  }
  const q = (details as { qualification?: string }).qualification;
  return q ? `Qualification: ${q}` : null;
}

export default async function EligibilityPage({
  searchParams,
}: {
  searchParams: Promise<{ flag?: string; status?: string; year?: string; noAward?: string }>;
}) {
  const params = await searchParams;
  const filters = {
    flag: params.flag,
    status: params.status,
    year: params.year,
    noAward: params.noAward === "1",
  };
  const [rows, grades, years] = await Promise.all([
    listEligibility(filters),
    gradesNeedingReview(),
    prisma.studentEligibilityFlag
      .findMany({ distinct: ["schoolYear"], select: { schoolYear: true } })
      .then((r) => r.map((x) => x.schoolYear).filter((y) => y !== "K-12").sort().reverse()),
  ]);
  const exportQuery = new URLSearchParams(
    Object.entries({ ...params }).filter(([, v]) => typeof v === "string" && v) as [string, string][],
  ).toString();

  return (
    <>
      <AdminPageHeader
        title="Eligibility"
        description="Every student's eligibility flags: who or what set each one, when, for which school year, and the evidence. Only approved flags make a student eligible for a restricted fund."
      />

      <Card className="mb-6 border-border/80">
        <CardContent className="p-4">
          <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">Flag</span>
              <select name="flag" defaultValue={params.flag ?? ""} className="h-9 rounded-md border border-input bg-background px-2">
                <option value="">All flags</option>
                {ELIGIBILITY_FLAGS.map((f) => (
                  <option key={f} value={f}>
                    {FLAG_LABEL[f]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">Status</span>
              <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-md border border-input bg-background px-2">
                <option value="">Any status</option>
                {FLAG_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {FLAG_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">School year</span>
              <select name="year" defaultValue={params.year ?? ""} className="h-9 rounded-md border border-input bg-background px-2">
                <option value="">All years</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex h-9 items-center gap-2">
              <input type="checkbox" name="noAward" value="1" defaultChecked={filters.noAward} className="size-4" />
              Without an award
            </label>
            <button type="submit" className="h-9 rounded-md bg-primary px-3 text-primary-foreground">
              Filter
            </button>
            <a
              href={`/api/admin/eligibility/export${exportQuery ? `?${exportQuery}` : ""}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 hover:bg-muted"
            >
              <Download className="size-4" /> Export CSV
            </a>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6 border-border/80">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No flags match. Flags are set when an application is approved, when income proof is decided, when a
              disability or displacement verification is decided, or by an override here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Flag</th>
                    <th className="px-4 py-3">Year</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Set by</th>
                    <th className="px-4 py-3">Evidence</th>
                    <th className="px-4 py-3 text-right">Awarded</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.flagId} className="border-b border-border/60 align-top last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{r.studentName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {r.schoolName ?? "No school"} · {r.grade ?? "no grade"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{isEligibilityFlag(r.flag) ? FLAG_LABEL[r.flag] : r.flag}</td>
                      <td className="px-4 py-3 tabular-nums">{r.schoolYear}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.status === "approved" ? "secondary" : "outline"}>
                          {isFlagStatus(r.status) ? FLAG_STATUS_LABEL[r.status] : r.status}
                        </Badge>
                        {r.reason ? <span className="mt-1 block max-w-[14rem] text-xs text-muted-foreground">{r.reason}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.source === "admin_override" ? "Admin override" : r.source === "verification" ? "Verification review" : "Application"}
                        {r.decidedAt ? <span className="block">{r.decidedAt.slice(0, 10)}</span> : null}
                        {r.decidedByEmail ? <span className="block">{r.decidedByEmail}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {detailText(r.details)}
                        {r.sourceApplicationId ? (
                          <Link href={`/dashboard/admin/scholarships/${r.sourceApplicationId}`} className="block text-primary underline-offset-4 hover:underline">
                            Application
                          </Link>
                        ) : null}
                        {r.verificationId ? (
                          <Link href={`/dashboard/admin/scholarships/verifications/${r.verificationId}`} className="block text-primary underline-offset-4 hover:underline">
                            Verification
                          </Link>
                        ) : null}
                        {r.documentId ? (
                          <a href={`/api/scholarship/documents/${r.documentId}/view`} target="_blank" rel="noreferrer" className="block text-primary underline-offset-4 hover:underline">
                            View document
                          </a>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">${r.awardedThisYear.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <OverrideFlagButton
                          studentId={r.studentId}
                          studentName={r.studentName}
                          flag={isEligibilityFlag(r.flag) ? r.flag : undefined}
                          schoolYear={r.schoolYear}
                          status={isFlagStatus(r.status) ? r.status : undefined}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Grades to review</CardTitle>
          <CardDescription>
            Grades that couldn&apos;t be matched to the shared list. Caps depend on the K-8 versus 9-12 split, so fix
            these before sending low-income money.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every stored grade is on the list.</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {grades.map((g) => (
                <li key={`${g.kind}-${g.id}`} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-medium text-foreground">{g.name}</span>{" "}
                    <span className="text-muted-foreground">
                      ({g.kind === "student" ? "student record" : "application"}): &ldquo;{g.grade}&rdquo;
                    </span>
                  </span>
                  <FixGradeControl kind={g.kind} id={g.id} suggestion={g.suggestion} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
