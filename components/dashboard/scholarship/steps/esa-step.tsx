"use client";

import { TriangleAlert } from "lucide-react";

import type { WizardValues } from "@/components/dashboard/scholarship/application-wizard";
import { FieldError, useFieldIssue } from "@/components/dashboard/scholarship/steps/field-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
export function EsaStep({
  values,
  onPatch,
  issues,
  readOnly,
}: {
  values: WizardValues;
  onPatch: (patch: Partial<WizardValues>) => void;
  issues: ValidationIssue[];
  readOnly: boolean;
}) {
  const issueFor = useFieldIssue(issues);

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
      </CardContent>
    </Card>
  );
}
