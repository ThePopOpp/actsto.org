"use client";

import Link from "next/link";
import { Info } from "lucide-react";

import { FieldError, useFieldIssue } from "@/components/dashboard/scholarship/steps/field-error";
import type { WizardValues } from "@/components/dashboard/scholarship/application-wizard";
import type { WizardData } from "@/components/dashboard/scholarship/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buttonVariants } from "@/lib/button-variants";
import { COPY, GRADE_OPTIONS } from "@/lib/scholarship/constants";
import type { ValidationIssue } from "@/lib/scholarship/validation";
import { cn } from "@/lib/utils";

export function FamilyStep({
  data,
  values,
  onPatch,
  issues,
  readOnly,
}: {
  data: WizardData;
  values: WizardValues;
  onPatch: (patch: Partial<WizardValues>) => void;
  issues: ValidationIssue[];
  readOnly: boolean;
}) {
  const issueFor = useFieldIssue(issues);

  return (
    <div className="space-y-5">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Parent information</CardTitle>
          <p className="text-sm text-muted-foreground">Pulled from your account.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="size-4" />
            <AlertDescription>
              Check that these details are right before you continue. To change them, edit your{" "}
              <Link
                href="/dashboard/parent/profile"
                className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
              >
                profile
              </Link>
              .
            </AlertDescription>
          </Alert>

          {/* Read-only, sourced from the profile — not a second place to edit it. */}
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Parent name
              </dt>
              <dd className="mt-1 text-sm text-foreground">{data.parent.name || "Not on file"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Phone
              </dt>
              <dd className="mt-1 text-sm text-foreground">{data.parent.phone || "Not on file"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mailing address
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {data.parent.addressLines.length > 0
                  ? data.parent.addressLines.map((line) => <span key={line} className="block">{line}</span>)
                  : "Not on file"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Student information</CardTitle>
          <p className="text-sm text-muted-foreground">{COPY.oneApplicationPerStudent}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="f-student">
              Student <span className="text-destructive">*</span>
            </Label>
            <Select
              value={values.studentId}
              onValueChange={(v) => onPatch({ studentId: v ?? "" })}
              disabled={readOnly}
            >
              <SelectTrigger
                id="f-student"
                className="mt-1.5 h-10"
                aria-describedby={issueFor("studentId") ? "err-studentId" : undefined}
                aria-invalid={Boolean(issueFor("studentId"))}
                data-field-error={issueFor("studentId") ? "true" : undefined}
              >
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {data.students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="err-studentId" issue={issueFor("studentId")} />
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Don&apos;t see your child?
              <Link
                href="/dashboard/parent/students"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Add a student
              </Link>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="f-year">
                School year <span className="text-destructive">*</span>
              </Label>
              <Select
                value={values.schoolYear}
                onValueChange={(v) => onPatch({ schoolYear: v ?? "" })}
                disabled={readOnly}
              >
                <SelectTrigger
                  id="f-year"
                  className="mt-1.5 h-10"
                  aria-describedby={issueFor("schoolYear") ? "err-schoolYear" : undefined}
                  aria-invalid={Boolean(issueFor("schoolYear"))}
                  data-field-error={issueFor("schoolYear") ? "true" : undefined}
                >
                  <SelectValue placeholder="Select a school year" />
                </SelectTrigger>
                <SelectContent>
                  {data.schoolYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="err-schoolYear" issue={issueFor("schoolYear")} />
            </div>

            <div>
              <Label htmlFor="f-grade">
                Grade for that year <span className="text-destructive">*</span>
              </Label>
              <Select
                value={values.grade}
                onValueChange={(v) => onPatch({ grade: v ?? "" })}
                disabled={readOnly}
              >
                <SelectTrigger
                  id="f-grade"
                  className="mt-1.5 h-10"
                  aria-describedby={issueFor("grade") ? "err-grade" : undefined}
                  aria-invalid={Boolean(issueFor("grade"))}
                  data-field-error={issueFor("grade") ? "true" : undefined}
                >
                  <SelectValue placeholder="Select a grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="err-grade" issue={issueFor("grade")} />
            </div>
          </div>

          <div>
            <Label htmlFor="f-school">
              School <span className="text-destructive">*</span>
            </Label>
            <Select
              value={values.schoolId}
              onValueChange={(v) => onPatch({ schoolId: v ?? "" })}
              disabled={readOnly}
            >
              <SelectTrigger
                id="f-school"
                className="mt-1.5 h-10"
                aria-describedby={issueFor("schoolId") ? "err-schoolId" : undefined}
                aria-invalid={Boolean(issueFor("schoolId"))}
                data-field-error={issueFor("schoolId") ? "true" : undefined}
              >
                <SelectValue placeholder="Select a school" />
              </SelectTrigger>
              <SelectContent>
                {data.schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.city ? `${school.name} — ${school.city}` : school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="err-schoolId" issue={issueFor("schoolId")} />
          </div>

          <div>
            <Label htmlFor="f-tuition">
              Tuition owed after every discount is applied{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative mt-1.5 max-w-xs">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
              >
                $
              </span>
              <Input
                id="f-tuition"
                type="text"
                inputMode="decimal"
                className="pl-7 tabular-nums"
                placeholder="0"
                value={values.tuitionAfterDiscounts}
                onChange={(e) => onPatch({ tuitionAfterDiscounts: e.target.value })}
                disabled={readOnly}
                aria-describedby={
                  issueFor("tuitionAfterDiscounts") ? "err-tuition help-tuition" : "help-tuition"
                }
                aria-invalid={Boolean(issueFor("tuitionAfterDiscounts"))}
                data-field-error={issueFor("tuitionAfterDiscounts") ? "true" : undefined}
              />
            </div>
            {/* This label matters — it is not the school's published rate. */}
            <p id="help-tuition" className="mt-1.5 text-sm text-muted-foreground">
              {COPY.tuitionHelper}
            </p>
            <FieldError id="err-tuition" issue={issueFor("tuitionAfterDiscounts")} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
