"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, TriangleAlert } from "lucide-react";

import type { WizardValues } from "@/components/dashboard/scholarship/application-wizard";
import type { WizardData, WizardDocument } from "@/components/dashboard/scholarship/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/lib/button-variants";
import {
  COPY,
  countWords,
  GRADE_OPTIONS,
  overflowBySlug,
  type ApplicationStepId,
} from "@/lib/scholarship/constants";
import {
  formatCurrency,
  householdAnnualTotal,
  memberAnnualTotal,
  type HouseholdMemberView,
} from "@/lib/scholarship/income";
import { documentWarnings, type ValidationIssue } from "@/lib/scholarship/validation";
import { cn } from "@/lib/utils";

/**
 * Step 6 — review and submit.
 *
 * Every field shows its real value. Nothing is blurred or truncated on the
 * parent's own review screen; this is their last chance to catch an error.
 * Anything missing renders in red with a specific message, never as a blank.
 */
export function ApplicationReviewStep({
  data,
  values,
  household,
  documents,
  incomeConfirmedAt,
  issues,
  locked,
  onEditStep,
  onBeforeSubmit,
}: {
  data: WizardData;
  values: WizardValues;
  household: HouseholdMemberView[];
  documents: WizardDocument[];
  incomeConfirmedAt: string | null;
  issues: ValidationIssue[];
  locked: boolean;
  onEditStep: (id: ApplicationStepId) => void;
  onBeforeSubmit: () => Promise<boolean>;
}) {
  const [certified, setCertified] = useState(Boolean(data.application.lockedAt));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ confirmationCode: string; warnings: string[] } | null>(
    data.application.confirmationCode && locked
      ? { confirmationCode: data.application.confirmationCode, warnings: [] }
      : null,
  );

  const student = data.students.find((s) => s.id === values.studentId);
  const school = data.schools.find((s) => s.id === values.schoolId);
  const qualification = overflowBySlug(values.overflowQualification);

  // Once locked, show the snapshot rather than the live household. The two
  // diverge deliberately, and what was certified is what the team reviews.
  const incomeRows = useMemo(
    () =>
      locked && data.certifiedIncome
        ? data.certifiedIncome.members.map((m, i) => ({
            key: `snapshot-${i}`,
            fullName: m.fullName,
            roleLabel: m.roleLabel,
            annualTotal: m.annualTotal,
          }))
        : household.map((m) => ({
            key: m.id,
            fullName: m.fullName,
            roleLabel: m.roleLabel,
            annualTotal: memberAnnualTotal(m),
          })),
    [locked, data.certifiedIncome, household],
  );

  const annualTotal =
    locked && data.certifiedIncome
      ? data.certifiedIncome.annualTotal
      : householdAnnualTotal(household);

  const warnings = useMemo(
    () =>
      documentWarnings({
        studentId: values.studentId || null,
        schoolYear: values.schoolYear || null,
        schoolId: values.schoolId || null,
        schoolNameOther: values.schoolNameOther || null,
        grade: values.grade || null,
        tuitionAfterDiscounts: values.tuitionAfterDiscounts === "" ? null : Number(values.tuitionAfterDiscounts),
        narrative: values.narrative,
        incomeConfirmedAt: incomeConfirmedAt ? new Date(incomeConfirmedAt) : null,
        overflowQualification: values.overflowQualification,
        overflowOrg: values.overflowOrg || null,
        esaCurrentYear: values.esaCurrentYear || null,
        esaPriorYear: values.esaPriorYear || null,
        documents: documents.map((d) => ({ id: d.id, purgedAt: null })),
      }),
    [values, incomeConfirmedAt, documents],
  );

  const canSubmit = issues.length === 0 && certified && !submitting && data.window?.canSubmit !== false;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Flush any pending autosave first, so we never submit a stale row.
      const flushed = await onBeforeSubmit();
      if (!flushed) throw new Error("Your latest answers haven't saved yet. Try again in a moment.");

      const res = await fetch(`/api/scholarship/applications/${data.application.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certified: true }),
      });
      const body = (await res.json().catch(() => null)) as
        | { confirmationCode?: string; warnings?: string[]; error?: string; issues?: ValidationIssue[] }
        | null;
      if (!res.ok || !body?.confirmationCode) {
        throw new Error(body?.error ?? "Could not submit your application.");
      }
      setResult({ confirmationCode: body.confirmationCode, warnings: body.warnings ?? [] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card className="border-border/80">
        <CardContent className="space-y-4 p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-primary" aria-hidden />
          <h2 className="font-heading text-2xl font-semibold text-primary">Application submitted</h2>
          <p className="mx-auto max-w-lg text-sm text-muted-foreground">
            We&apos;ve emailed you a copy. Our team reviews every application by hand, and
            we&apos;ll write to you when there&apos;s a decision or if we need anything else.
          </p>
          <p className="text-sm">
            Confirmation code{" "}
            <strong className="font-heading text-lg tabular-nums text-primary">
              {result.confirmationCode}
            </strong>
          </p>
          {result.warnings.length > 0 ? (
            <Alert className="text-left">
              <TriangleAlert className="size-4" />
              <AlertTitle>One thing to follow up</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
          <Link href="/dashboard/parent/apply" className={cn(buttonVariants({ variant: "outline" }))}>
            Back to your applications
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Check everything over</CardTitle>
          <p className="text-sm text-muted-foreground">{COPY.reviewIntro}</p>
        </CardHeader>
      </Card>

      <ReviewSection title="Family and student" onEdit={() => onEditStep("family")} locked={locked}>
        <ReviewRow label="Student" value={student?.name} missing="No student selected" />
        <ReviewRow label="School year" value={values.schoolYear} missing="No school year selected" />
        <ReviewRow
          label="Grade"
          value={GRADE_OPTIONS.includes(values.grade) ? values.grade : values.grade}
          missing="No grade selected"
        />
        <ReviewRow
          label="School"
          // A typed "Other" name is a real answer — show it rather than claiming
          // nothing was selected.
          value={school?.name ?? (values.schoolNameOther.trim() || undefined)}
          missing="No school selected"
        />
        <ReviewRow
          label="Tuition owed after discounts"
          value={
            values.tuitionAfterDiscounts === ""
              ? undefined
              : formatCurrency(Number(values.tuitionAfterDiscounts), { cents: true })
          }
          missing="Not answered"
        />
        <ReviewRow label="Parent" value={data.parent.name} missing="Not on file" />
        <ReviewRow label="Phone" value={data.parent.phone ?? undefined} missing="Not on file" />
        <ReviewRow
          label="Mailing address"
          value={data.parent.addressLines.join(", ") || undefined}
          missing="Not on file"
        />
      </ReviewSection>

      <ReviewSection
        title="Narrative"
        badge={`${countWords(values.narrative)} words`}
        onEdit={() => onEditStep("narrative")}
        locked={locked}
      >
        {values.narrative.trim() ? (
          <p className="whitespace-pre-wrap text-sm text-foreground">{values.narrative}</p>
        ) : (
          <p className="text-sm font-medium text-destructive">Not answered</p>
        )}
      </ReviewSection>

      <ReviewSection title="Household income" onEdit={() => onEditStep("financial")} locked={locked}>
        {incomeRows.length === 0 ? (
          <p className="text-sm font-medium text-destructive">No household members added</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="py-2 font-medium">Member</th>
                  <th scope="col" className="py-2 text-right font-medium">Yearly total</th>
                </tr>
              </thead>
              <tbody>
                {incomeRows.map((member) => (
                  <tr key={member.key} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="py-2 text-left font-normal text-foreground">
                      {member.fullName}
                      {member.roleLabel ? (
                        <span className="text-muted-foreground"> · {member.roleLabel}</span>
                      ) : null}
                    </th>
                    <td className="py-2 text-right tabular-nums text-foreground">
                      {formatCurrency(member.annualTotal)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border">
                  <th scope="row" className="py-2 text-left font-medium text-foreground">
                    Household total ({incomeRows.length}{" "}
                    {incomeRows.length === 1 ? "person" : "people"})
                  </th>
                  <td className="py-2 text-right font-semibold tabular-nums text-foreground">
                    {formatCurrency(annualTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 space-y-1">
          {incomeConfirmedAt ? (
            <p className="text-sm text-muted-foreground">
              Confirmed accurate for {values.schoolYear || "this school year"} on{" "}
              {new Date(incomeConfirmedAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              .
            </p>
          ) : !locked ? (
            <p className="text-sm font-medium text-destructive">
              Income not yet confirmed for this school year
            </p>
          ) : null}
          {locked && data.certifiedIncome ? (
            // Otherwise a parent who has since updated their income sees a
            // different number here and reasonably assumes it's a bug.
            <p className="text-sm text-muted-foreground">
              These are the figures you certified when you submitted. Updating your household income
              now doesn&apos;t change them.
            </p>
          ) : null}
        </div>
      </ReviewSection>

      <ReviewSection title="Overflow qualification" onEdit={() => onEditStep("overflow")} locked={locked}>
        <ReviewRow label="Qualification" value={qualification?.title} missing="Not answered" />
        {values.overflowQualification === "prior-award" ? (
          <ReviewRow
            label="Awarding organization"
            value={values.overflowOrg || undefined}
            missing="Not answered"
          />
        ) : null}
        <ReviewRow
          label="Documents attached"
          value={
            documents.length > 0
              ? documents.map((d) => d.fileName).join(", ")
              : qualification?.needsDocs
                ? undefined
                : "None needed"
          }
          missing="None attached"
        />
        {values.overflowComments ? (
          <ReviewRow label="Comments for the review team" value={values.overflowComments} missing="" />
        ) : null}
      </ReviewSection>

      <ReviewSection title="ESA status" onEdit={() => onEditStep("esa")} locked={locked}>
        <ReviewRow
          label="ESA contract for the year you're applying for"
          value={esaLabel(values.esaCurrentYear)}
          missing="Not answered"
        />
        <ReviewRow
          label="ESA contract the school year before"
          value={esaLabel(values.esaPriorYear)}
          missing="Not answered"
        />
      </ReviewSection>

      {warnings.length > 0 && !locked ? (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {issues.length > 0 && !locked ? (
        <Alert variant="destructive">
          <CircleAlert className="size-4" />
          <AlertTitle>
            {issues.length === 1
              ? "One thing is still missing"
              : `${issues.length} things are still missing`}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {issues.map((issue) => (
                <li key={`${issue.section}-${issue.field}`}>
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => onEditStep(issue.section)}
                  >
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {!locked ? (
        <Card className="border-border/80">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="f-certify"
                checked={certified}
                onCheckedChange={(checked) => setCertified(checked === true)}
              />
              <Label htmlFor="f-certify" className="font-normal leading-snug">
                I certify that everything in this application is true and complete to the best of my
                knowledge, and I understand that ACT may ask for documentation to support it.
              </Label>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="button" onClick={() => void submit()} disabled={!canSubmit}>
              {submitting ? "Submitting…" : "Submit application"}
            </Button>

            {!certified ? (
              <p className="text-sm text-muted-foreground">
                Tick the box above to submit.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function esaLabel(value: string): string | undefined {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "unsure") return "Not sure yet";
  return undefined;
}

function ReviewSection({
  title,
  badge,
  locked,
  onEdit,
  children,
}: {
  title: string;
  badge?: string;
  locked: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-base text-primary">
            {title}
            {badge ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">{badge}</span>
            ) : null}
          </CardTitle>
          {!locked ? (
            <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
              Edit
              <span className="sr-only"> {title}</span>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * A missing value renders in red with a specific message, never as a blank cell.
 *
 * Plain divs rather than dt/dd: some sections hold prose or a table instead of
 * pairs, and a half-populated <dl> is worse markup than none.
 */
function ReviewRow({
  label,
  value,
  missing,
}: {
  label: string;
  value: string | undefined;
  missing: string;
}) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-2 last:border-0 sm:grid-cols-[220px_1fr] sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn("text-sm", value ? "text-foreground" : "font-medium text-destructive")}
      >
        {value || missing}
      </span>
    </div>
  );
}
