"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleAlert, RotateCcw } from "lucide-react";

import type { WizardData } from "@/components/dashboard/scholarship/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { PARENT_STATUS_LABEL, overflowBySlug } from "@/lib/scholarship/constants";
import { formatCurrency, householdAnnualTotal } from "@/lib/scholarship/income";
import { cn } from "@/lib/utils";

/**
 * A denied or withdrawn application, read-only.
 *
 * The row itself is never edited or revived — "apply again" creates a new
 * attempt chained to this one. This screen exists so a family can see what they
 * sent and what they were told, which is the difference between a decision and
 * a dead end.
 */
export function DeniedApplicationView({ data }: { data: WizardData }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const application = data.application;
  const student = data.students.find((s) => s.id === application.studentId);
  const school = data.schools.find((s) => s.id === application.schoolId);
  const qualification = overflowBySlug(application.overflowQualification);
  const canReapply = application.status === "denied" && data.window?.canSubmit === true;

  async function reapply() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/scholarship/applications/${application.id}/reapply`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => null)) as
        | { redirect?: string; error?: string }
        | null;
      if (!res.ok || !body?.redirect) {
        throw new Error(body?.error ?? "Could not start a new application.");
      }
      router.push(body.redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a new application.");
      setStarting(false);
    }
  }

  // The frozen snapshot, not the live household — the parent may well have
  // edited their income since, and this screen shows what was certified.
  const annualTotal = data.certifiedIncome?.annualTotal ?? householdAnnualTotal(data.household);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Scholarship application
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold text-primary">
            {student?.name ?? "Your student"} · {application.schoolYear}
          </h1>
          <Badge variant="secondary">
            {PARENT_STATUS_LABEL[application.status] ?? application.status}
          </Badge>
        </div>
        {application.attemptNumber > 1 ? (
          <p className="text-sm text-muted-foreground">
            Attempt {application.attemptNumber} for this school year.
          </p>
        ) : null}
      </header>

      {data.priorDenialMessage || application.status === "denied" ? (
        <Alert>
          <CircleAlert className="size-4" />
          <AlertTitle>What our team told you</AlertTitle>
          <AlertDescription>
            {data.priorDenialMessage ??
              "This application wasn't approved. Check your email for the message from our team, or contact us and we'll go through it with you."}
          </AlertDescription>
        </Alert>
      ) : null}

      {canReapply ? (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-base text-primary">
              You can apply again for this school year
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We&apos;ll bring your answers and any documents still on file across, so you&apos;re
              editing rather than starting over. You&apos;ll need to confirm your household income
              and certify the new application before submitting it.
            </p>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="button" className="gap-2" onClick={() => void reapply()} disabled={starting}>
              <RotateCcw className="size-4" aria-hidden />
              {starting ? "Starting…" : "Apply again"}
            </Button>
          </CardContent>
        </Card>
      ) : application.status === "denied" ? (
        <Alert>
          <CircleAlert className="size-4" />
          <AlertTitle>Applications have closed for this year</AlertTitle>
          <AlertDescription>
            A new application isn&apos;t possible right now. Please contact us if your circumstances
            have changed — we&apos;d rather talk it through than leave it here.{" "}
            <Link
              href="/contact"
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
            >
              Contact our team
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-base text-primary">What you sent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Student" value={student?.name} />
          <Row label="School year" value={application.schoolYear} />
          <Row label="Grade" value={application.grade} />
          <Row label="School" value={school?.name} />
          <Row
            label="Tuition owed after discounts"
            value={
              application.tuitionAfterDiscounts === null
                ? null
                : formatCurrency(application.tuitionAfterDiscounts, { cents: true })
            }
          />
          <Row label="Household income (as certified)" value={formatCurrency(annualTotal)} />
          <Row label="Overflow qualification" value={qualification?.title} />
          <Row label="Confirmation code" value={application.confirmationCode} />
        </CardContent>
      </Card>

      {application.narrative ? (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-base text-primary">Your narrative</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground">{application.narrative}</p>
          </CardContent>
        </Card>
      ) : null}

      <Link href="/dashboard/parent/apply" className={cn(buttonVariants({ variant: "outline" }))}>
        Back to your applications
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-2 last:border-0 sm:grid-cols-[240px_1fr] sm:gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value || "Not answered"}</span>
    </div>
  );
}
