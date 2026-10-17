"use client";

import { useState } from "react";
import { Plus, TriangleAlert, X } from "lucide-react";

import type { WizardValues } from "@/components/dashboard/scholarship/application-wizard";
import { FieldError, useFieldIssue } from "@/components/dashboard/scholarship/steps/field-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OTHER_STO_PROGRAMS } from "@/lib/award-policy/limits";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COPY,
  ESA_CURRENT_YEAR_OPTIONS,
  ESA_CURRENT_YEAR_QUESTION,
  ESA_PRIOR_YEAR_OPTIONS,
  ESA_PRIOR_YEAR_QUESTION,
} from "@/lib/scholarship/constants";
import type { ValidationIssue } from "@/lib/scholarship/validation";

/**
 * Step 5. The explanatory copy stays as written — parents genuinely
 * misunderstand this, and every paragraph here answers a question the team
 * would otherwise field by phone.
 */
type StoRow = { stoName: string; program: string; amount: number | string };

export function EsaStep({
  values,
  onPatch,
  issues,
  readOnly,
  applicationId,
  otherStoRows,
  onOtherStoCount,
}: {
  values: WizardValues;
  onPatch: (patch: Partial<WizardValues>) => void;
  issues: ValidationIssue[];
  readOnly: boolean;
  applicationId: string;
  otherStoRows: { stoName: string; program: string; amount: number }[];
  onOtherStoCount: (count: number) => void;
}) {
  const issueFor = useFieldIssue(issues);
  const [rows, setRows] = useState<StoRow[]>(otherStoRows.length ? otherStoRows : [{ stoName: "", program: "unknown", amount: "" }]);
  const [stoStatus, setStoStatus] = useState<{ error: boolean; text: string } | null>(null);
  const [savingSto, setSavingSto] = useState(false);

  async function saveRows(next: StoRow[]) {
    setSavingSto(true);
    setStoStatus(null);
    const res = await fetch(`/api/scholarship/applications/${applicationId}/other-sto`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: next }),
    });
    const data = (await res.json().catch(() => null)) as { rows?: StoRow[]; error?: string } | null;
    setSavingSto(false);
    if (!res.ok || !data?.rows) {
      setStoStatus({ error: true, text: data?.error ?? "Not saved." });
      return;
    }
    onOtherStoCount(data.rows.length);
    setStoStatus({ error: false, text: data.rows.length ? "Saved." : "Cleared." });
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-primary">
          Empowerment Scholarship Account status
        </CardTitle>
        <p className="text-sm text-muted-foreground">Two questions, both required.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>{COPY.esaIntro}</p>
          <p>{COPY.esaContractRule}</p>
          <p>{COPY.esaHeldAward}</p>
        </div>

        <Alert>
          <TriangleAlert className="size-4" />
          <AlertDescription>{COPY.esaChangeNotice}</AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="f-esa-current" className="leading-snug">
            {ESA_CURRENT_YEAR_QUESTION} <span className="text-destructive">*</span>
          </Label>
          <Select
            value={values.esaCurrentYear}
            onValueChange={(v) => onPatch({ esaCurrentYear: v ?? "" })}
            disabled={readOnly}
          >
            <SelectTrigger
              id="f-esa-current"
              className="mt-1.5 h-10 max-w-sm"
              aria-describedby={issueFor("esaCurrentYear") ? "err-esa-current" : undefined}
              aria-invalid={Boolean(issueFor("esaCurrentYear"))}
              data-field-error={issueFor("esaCurrentYear") ? "true" : undefined}
            >
              <SelectValue placeholder="Select an answer" />
            </SelectTrigger>
            <SelectContent>
              {ESA_CURRENT_YEAR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id="err-esa-current" issue={issueFor("esaCurrentYear")} />
        </div>

        <div>
          <Label htmlFor="f-esa-prior" className="leading-snug">
            {ESA_PRIOR_YEAR_QUESTION} <span className="text-destructive">*</span>
          </Label>
          <Select
            value={values.esaPriorYear}
            onValueChange={(v) => onPatch({ esaPriorYear: v ?? "" })}
            disabled={readOnly}
          >
            <SelectTrigger
              id="f-esa-prior"
              className="mt-1.5 h-10 max-w-sm"
              aria-describedby={issueFor("esaPriorYear") ? "err-esa-prior" : undefined}
              aria-invalid={Boolean(issueFor("esaPriorYear"))}
              data-field-error={issueFor("esaPriorYear") ? "true" : undefined}
            >
              <SelectValue placeholder="Select an answer" />
            </SelectTrigger>
            <SelectContent>
              {ESA_PRIOR_YEAR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id="err-esa-prior" issue={issueFor("esaPriorYear")} />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium leading-snug">
            Has your student received, or been awarded, a scholarship from another school tuition organization (STO) for
            this school year? <span className="text-destructive">*</span>
          </legend>
          <p className="text-sm text-muted-foreground">
            Arizona limits what a student may receive from all STOs together to the year&apos;s tuition, and limits
            disabled/displaced scholarships from all STOs to the lesser of tuition or 90% of state aid. Tell us about every
            scholarship from another STO this school year, including any that hasn&apos;t been paid yet.
          </p>
          <div className="flex gap-4 text-sm">
            {(["yes", "no"] as const).map((v) => (
              <label key={v} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="other-sto"
                  className="size-4"
                  disabled={readOnly}
                  checked={values.otherStoAnswer === v}
                  onChange={() => {
                    onPatch({ otherStoAnswer: v });
                    if (v === "no") {
                      setRows([{ stoName: "", program: "unknown", amount: "" }]);
                      void saveRows([]);
                    }
                  }}
                />
                {v === "yes" ? "Yes" : "No"}
              </label>
            ))}
          </div>
          <FieldError id="err-other-sto" issue={issueFor("otherStoAnswer")} />
          {values.otherStoAnswer === "yes" ? (
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              {rows.map((row, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_13rem_8rem_auto] sm:items-end">
                  <div>
                    <Label className="text-xs">STO name</Label>
                    <Input className="mt-1" disabled={readOnly} value={row.stoName} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, stoName: e.target.value } : r)))} />
                  </div>
                  <div>
                    <Label className="text-xs">Program, if you know it</Label>
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                      disabled={readOnly}
                      value={row.program}
                      onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, program: e.target.value } : r)))}
                    >
                      {OTHER_STO_PROGRAMS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Amount $</Label>
                    <Input className="mt-1" inputMode="decimal" disabled={readOnly} value={String(row.amount)} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))} />
                  </div>
                  <Button type="button" variant="ghost" size="sm" aria-label="Remove" disabled={readOnly} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={readOnly} onClick={() => setRows([...rows, { stoName: "", program: "unknown", amount: "" }])}>
                  <Plus className="mr-1 size-3.5" /> Add another
                </Button>
                <Button type="button" size="sm" disabled={readOnly || savingSto} onClick={() => void saveRows(rows)}>
                  {savingSto ? "Saving…" : "Save these scholarships"}
                </Button>
                {stoStatus ? <span className={stoStatus.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{stoStatus.text}</span> : null}
              </div>
              <FieldError id="err-other-sto-rows" issue={issueFor("otherStoRows")} />
            </div>
          ) : null}
        </fieldset>
      </CardContent>
    </Card>
  );
}
