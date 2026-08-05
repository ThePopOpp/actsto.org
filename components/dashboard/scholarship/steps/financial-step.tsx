"use client";

import { useState } from "react";
import { Clock, Info } from "lucide-react";

import { HouseholdIncomeLedger } from "@/components/dashboard/scholarship/household-income-ledger";
import { FieldError, useFieldIssue } from "@/components/dashboard/scholarship/steps/field-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COPY } from "@/lib/scholarship/constants";
import type { HouseholdMemberView } from "@/lib/scholarship/income";
import type { ValidationIssue } from "@/lib/scholarship/validation";

/**
 * Step 3. The one a returning parent is most likely to click through on
 * autopilot, and the data they are certifying at submission — so the friction
 * here is deliberate.
 */
export function FinancialStep({
  applicationId,
  schoolYear,
  household,
  householdLastUpdated,
  incomeConfirmedAt,
  onHouseholdChanged,
  onConfirmed,
  issues,
  readOnly,
}: {
  applicationId: string;
  schoolYear: string;
  household: HouseholdMemberView[];
  householdLastUpdated: string | null;
  incomeConfirmedAt: string | null;
  onHouseholdChanged: (members: HouseholdMemberView[]) => void;
  onConfirmed: (at: string | null) => void;
  issues: ValidationIssue[];
  readOnly: boolean;
}) {
  const issueFor = useFieldIssue(issues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staleMonths = householdLastUpdated
    ? monthsSince(new Date(householdLastUpdated))
    : null;

  async function setConfirmation(confirmed: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/scholarship/applications/${applicationId}/confirm-income`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed }),
      });
      const data = (await res.json().catch(() => null)) as
        | { incomeConfirmedAt?: string | null; error?: string }
        | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not save your confirmation.");
      onConfirmed(data?.incomeConfirmedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your confirmation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Financial information</CardTitle>
          <p className="text-sm text-muted-foreground">{COPY.financialRequired}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="size-4" />
            <AlertDescription>{COPY.householdDefinition}</AlertDescription>
          </Alert>

          <div className="max-w-xs">
            <Label htmlFor="f-headcount">People living in your household</Label>
            {/* Derived, never typed — a free number can contradict the table. */}
            <Input
              id="f-headcount"
              readOnly
              value={household.length}
              className="mt-1.5 tabular-nums"
              aria-describedby="help-headcount"
            />
            <p id="help-headcount" className="mt-1.5 text-sm text-muted-foreground">
              {COPY.headcountHelper}
            </p>
          </div>
        </CardContent>
      </Card>

      {staleMonths !== null && staleMonths >= 12 ? (
        <Alert>
          <Clock className="size-4" />
          <AlertDescription>
            These figures were last updated{" "}
            {new Date(householdLastUpdated!).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
            . Check them over before you confirm — you&apos;re vouching for them as current.
          </AlertDescription>
        </Alert>
      ) : null}

      <HouseholdIncomeLedger
        initialMembers={household}
        initialLastUpdated={householdLastUpdated}
        readOnly={readOnly}
        onChanged={onHouseholdChanged}
      />

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-base text-primary">
            Confirm this income is current
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="f-income-confirm"
              checked={Boolean(incomeConfirmedAt)}
              onCheckedChange={(checked) => void setConfirmation(checked === true)}
              disabled={readOnly || saving || household.length === 0}
              aria-describedby={
                issueFor("incomeConfirmed") ? "err-income-confirm" : "help-income-confirm"
              }
              data-field-error={issueFor("incomeConfirmed") ? "true" : undefined}
            />
            <div className="space-y-1">
              {/* Name the year explicitly. A generic "I confirm" is easy to click past. */}
              <Label htmlFor="f-income-confirm" className="font-normal leading-snug">
                I confirm this income is accurate for the {schoolYear || "coming"} school year.
              </Label>
              <p id="help-income-confirm" className="text-sm text-muted-foreground">
                {incomeConfirmedAt
                  ? `Confirmed ${new Date(incomeConfirmedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}. Changing anything above clears this and asks you again.`
                  : "Income carries over between years, so these figures may already be filled in. Confirming says they're right for this year."}
              </p>
            </div>
          </div>

          {household.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add at least one household member before you can confirm.
            </p>
          ) : null}

          <FieldError id="err-income-confirm" issue={issueFor("incomeConfirmed")} />
          <FieldError id="err-household" issue={issueFor("household")} />

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function monthsSince(date: Date): number {
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
}
