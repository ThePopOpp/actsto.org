"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";

import type { WizardValues } from "@/components/dashboard/scholarship/application-wizard";
import { FieldError, useFieldIssue } from "@/components/dashboard/scholarship/steps/field-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COPY,
  countWords,
  NARRATIVE_GUIDANCE_MAX,
  NARRATIVE_GUIDANCE_MIN,
} from "@/lib/scholarship/constants";
import type { ValidationIssue } from "@/lib/scholarship/validation";

export function NarrativeStep({
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
  const words = useMemo(() => countWords(values.narrative), [values.narrative]);

  // Above the guidance range we warn. We never truncate what a parent wrote.
  const hint =
    words === 0
      ? `Aim for ${NARRATIVE_GUIDANCE_MIN}–${NARRATIVE_GUIDANCE_MAX} words`
      : words < NARRATIVE_GUIDANCE_MIN
        ? `Aim for ${NARRATIVE_GUIDANCE_MIN}–${NARRATIVE_GUIDANCE_MAX} words`
        : words <= NARRATIVE_GUIDANCE_MAX
          ? "Good length"
          : `Longer than we suggest — that's fine, but the review team reads a lot of these`;

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-primary">Tell us about your student</CardTitle>
        <p className="text-sm text-muted-foreground">{COPY.narrativeLength}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="size-4" />
          <AlertDescription>{COPY.narrativeGuidance}</AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="f-narrative">
            Student narrative <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="f-narrative"
            className="mt-1.5 min-h-64"
            placeholder="Draft this somewhere you trust first, then paste it here."
            value={values.narrative}
            onChange={(e) => onPatch({ narrative: e.target.value })}
            disabled={readOnly}
            aria-describedby={issueFor("narrative") ? "err-narrative narrative-count" : "narrative-count"}
            aria-invalid={Boolean(issueFor("narrative"))}
            data-field-error={issueFor("narrative") ? "true" : undefined}
          />
          <div
            id="narrative-count"
            className="mt-1.5 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground"
          >
            {/* The count changes as they type, so announce it politely. */}
            <span role="status" aria-live="polite" className="tabular-nums">
              {words} {words === 1 ? "word" : "words"}
            </span>
            <span>{hint}</span>
          </div>
          <FieldError id="err-narrative" issue={issueFor("narrative")} />
        </div>
      </CardContent>
    </Card>
  );
}
