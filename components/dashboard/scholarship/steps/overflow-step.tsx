"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Info, Paperclip, Trash2, TriangleAlert } from "lucide-react";

import type { WizardValues } from "@/components/dashboard/scholarship/application-wizard";
import { FieldError, useFieldIssue } from "@/components/dashboard/scholarship/steps/field-error";
import type { WizardDocument } from "@/components/dashboard/scholarship/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isK12 } from "@/lib/grades";
import {
  AWARDING_ORGANIZATIONS,
  COPY,
  DISPLACED_FORM_URL,
  DOCUMENT_KINDS,
  DOCUMENT_MAX_BYTES,
  OVERFLOW_QUALIFICATIONS,
  overflowBySlug,
} from "@/lib/scholarship/constants";
import { DISPLACED_RETENTION_NOTICE, RETENTION_NOTICE } from "@/lib/scholarship/retention-copy";
import type { ValidationIssue } from "@/lib/scholarship/validation";
import { cn } from "@/lib/utils";
import { DISABILITY_DOCUMENT_HELP } from "@/lib/award-policy/disability";

export function OverflowStep({
  applicationId,
  values,
  onPatch,
  documents,
  onDocumentsChanged,
  missingImportedDocuments,
  issues,
  readOnly,
  disabilityAutoSet = false,
  displacedDefinition = "",
}: {
  applicationId: string;
  values: WizardValues;
  onPatch: (patch: Partial<WizardValues>) => void;
  documents: WizardDocument[];
  onDocumentsChanged: (documents: WizardDocument[]) => void;
  missingImportedDocuments: string[];
  issues: ValidationIssue[];
  readOnly: boolean;
  disabilityAutoSet?: boolean;
  displacedDefinition?: string;
}) {
  const issueFor = useFieldIssue(issues);
  const selected = overflowBySlug(values.overflowQualification);
  const askDisplaced = isK12(values.grade);

  return (
    <div className="space-y-5">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Overflow qualification</CardTitle>
          <p className="text-sm text-muted-foreground">Which of these describes your student?</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert>
            <Info className="size-4" />
            <AlertDescription>{COPY.overflowGuidance}</AlertDescription>
          </Alert>

          <fieldset>
            <legend className="sr-only">Overflow qualification</legend>
            <RadioGroup
              value={values.overflowQualification}
              onValueChange={(v) => onPatch({ overflowQualification: String(v ?? "") })}
              disabled={readOnly}
              className="space-y-2"
              aria-describedby={issueFor("overflowQualification") ? "err-overflow" : undefined}
              data-field-error={issueFor("overflowQualification") ? "true" : undefined}
            >
              {OVERFLOW_QUALIFICATIONS.map((option) => {
                const isSelected = values.overflowQualification === option.slug;
                return (
                  <div
                    key={option.slug}
                    className={cn(
                      "rounded-lg border p-4 transition-colors",
                      isSelected ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={option.slug} id={`overflow-${option.slug}`} className="mt-1" />
                      <div className="space-y-1">
                        <Label
                          htmlFor={`overflow-${option.slug}`}
                          className="font-medium leading-snug text-foreground"
                        >
                          {option.title}
                        </Label>
                        <p className="text-sm text-muted-foreground">{option.detail}</p>
                      </div>
                    </div>

                    {isSelected && option.needsDocs ? (
                      <Alert className="mt-3">
                        <Paperclip className="size-4" />
                        <AlertDescription>{COPY.overflowDocsNeeded}</AlertDescription>
                      </Alert>
                    ) : null}

                    {isSelected && option.isNone ? (
                      // Nine things you don't qualify for reads as bad news
                      // unless you say otherwise.
                      <Alert className="mt-3">
                        <CheckCircle2 className="size-4" />
                        <AlertDescription>{COPY.overflowNoneReassurance}</AlertDescription>
                      </Alert>
                    ) : null}

                    {isSelected && option.needsOrg ? (
                      <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/40 p-3">
                        <p className="text-sm text-muted-foreground">{COPY.overflowOrgPrompt}</p>
                        <Label htmlFor="f-overflow-org">Awarding organization</Label>
                        <Select
                          value={values.overflowOrg}
                          onValueChange={(v) => onPatch({ overflowOrg: v ?? "" })}
                          disabled={readOnly}
                        >
                          <SelectTrigger
                            id="f-overflow-org"
                            className="h-10 max-w-md"
                            aria-invalid={Boolean(issueFor("overflowOrg"))}
                            data-field-error={issueFor("overflowOrg") ? "true" : undefined}
                          >
                            <SelectValue placeholder="Select an organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {AWARDING_ORGANIZATIONS.map((org) => (
                              <SelectItem key={org} value={org}>
                                {org}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError id="err-overflowOrg" issue={issueFor("overflowOrg")} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </RadioGroup>
            <FieldError id="err-overflow" issue={issueFor("overflowQualification")} />
          </fieldset>

          <div>
            <Label htmlFor="f-overflow-comments">
              Anything you&apos;d like the review team to know{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="f-overflow-comments"
              className="mt-1.5 min-h-28"
              placeholder="Context about your student's situation, documents that are on the way, and so on."
              value={values.overflowComments}
              onChange={(e) => onPatch({ overflowComments: e.target.value })}
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Student circumstances: on the same step as the reasons above, so a
          parent sees the disability answer change when they pick a disability
          reason. Independent of the reason: any combination is allowed. */}
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Student circumstances</CardTitle>
          <p className="text-sm text-muted-foreground">
            These are separate from the situation you picked above, so answer both even if one already covers it.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="font-medium text-foreground">Does your student have a disability?</legend>
            <p className="text-sm text-muted-foreground">{DISABILITY_DOCUMENT_HELP} Upload it below.</p>
            <YesNo
              name="has-disability"
              value={values.hasDisability}
              onChange={(v) => onPatch({ hasDisability: v })}
              disabled={readOnly}
              invalid={Boolean(issueFor("hasDisability"))}
            />
            {values.hasDisability === "yes" && disabilityAutoSet ? (
              <p className="text-xs text-muted-foreground">
                Set to Yes because you chose a disability option above. One document covers both.
              </p>
            ) : null}
            <FieldError id="err-hasDisability" issue={issueFor("hasDisability")} />
          </fieldset>

          {askDisplaced ? (
            <fieldset className="space-y-2">
              <legend className="font-medium text-foreground">Is your student a displaced student?</legend>
              <p className="text-sm text-muted-foreground">{displacedDefinition}</p>
              <YesNo
                name="is-displaced"
                value={values.isDisplaced}
                onChange={(v) => onPatch({ isDisplaced: v })}
                disabled={readOnly}
                invalid={Boolean(issueFor("isDisplaced"))}
              />
              {values.isDisplaced === "yes" ? (
                <Alert>
                  <Info className="size-4" />
                  <AlertDescription className="space-y-2">
                    <p>
                      <a href={DISPLACED_FORM_URL} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
                        Download the Displaced Student Verification Form
                      </a>
                      , sign it, and upload it below as &ldquo;Signed Displaced Student Verification Form&rdquo;. We
                      confirm placement with the Arizona Department of Child Safety. Displaced status is verified once
                      and lasts through 12th grade.
                    </p>
                    <p className="font-medium">
                      Do not upload court documents, case files or emails with caseworkers.
                    </p>
                    <p className="text-xs">{DISPLACED_RETENTION_NOTICE}</p>
                  </AlertDescription>
                </Alert>
              ) : null}
              <FieldError id="err-isDisplaced" issue={issueFor("isDisplaced")} />
            </fieldset>
          ) : (
            <p className="text-sm text-muted-foreground">
              Displaced-student scholarships apply from Kindergarten through 12th grade, so we don&apos;t ask for
              preschool.
            </p>
          )}
        </CardContent>
      </Card>

      <DocumentUploader
        applicationId={applicationId}
        documents={documents.filter((d) => d.documentKind !== "income_proof")}
        allDocuments={documents}
        onDocumentsChanged={onDocumentsChanged}
        missingImportedDocuments={missingImportedDocuments}
        readOnly={readOnly}
        needsDocs={selected?.needsDocs === true}
        kinds={DOCUMENT_KINDS.filter((k) => k.value !== "income_proof")}
        defaultKind={
          values.isDisplaced === "yes" && !documents.some((d) => d.documentKind === "displaced_form")
            ? "displaced_form"
            : values.hasDisability === "yes"
              ? "iep"
              : selected?.slug === "military"
                ? "military_orders"
                : selected?.slug === "esa-prior"
                  ? "esa_closure"
                  : "other"
        }
      />
    </div>
  );
}

function YesNo({
  name,
  value,
  onChange,
  disabled,
  invalid,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  invalid: boolean;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(String(v ?? ""))}
      disabled={disabled}
      className="flex gap-6"
      data-field-error={invalid ? "true" : undefined}
    >
      {[
        { v: "yes", label: "Yes" },
        { v: "no", label: "No" },
      ].map((option) => (
        <div key={option.v} className="flex items-center gap-2">
          <RadioGroupItem value={option.v} id={name + "-" + option.v} />
          <Label htmlFor={name + "-" + option.v} className="font-normal">
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

// ── Uploads ──────────────────────────────────────────────────────────────────

/**
 * Upload and list supporting files. `documents` is what this list shows;
 * `allDocuments` (default: the same) is the full set changes are applied to, so
 * two uploaders on different steps don't drop each other's files.
 */
export function DocumentUploader({
  applicationId,
  documents,
  allDocuments,
  onDocumentsChanged,
  missingImportedDocuments,
  readOnly,
  needsDocs,
  kinds = DOCUMENT_KINDS,
  defaultKind = "other",
  title = "Supporting documents",
  emptyText,
}: {
  applicationId: string;
  documents: WizardDocument[];
  allDocuments?: WizardDocument[];
  onDocumentsChanged: (documents: WizardDocument[]) => void;
  missingImportedDocuments: string[];
  readOnly: boolean;
  needsDocs: boolean;
  kinds?: { value: string; label: string }[];
  defaultKind?: string;
  title?: string;
  emptyText?: string;
}) {
  const everything = allDocuments ?? documents;
  const [kind, setKind] = useState(defaultKind);
  const [kindTouched, setKindTouched] = useState(false);
  const effectiveKind = kindTouched ? kind : defaultKind;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0 || readOnly) return;
    setError(null);

    for (const file of Array.from(files)) {
      if (file.size > DOCUMENT_MAX_BYTES) {
        setError(
          `${file.name} is larger than ${Math.round(DOCUMENT_MAX_BYTES / (1024 * 1024))}MB. Try a smaller scan or split it into pages.`,
        );
        continue;
      }

      setUploading((state) => [...state, file.name]);
      try {
        const body = new FormData();
        body.append("file", file);
        body.append("documentKind", effectiveKind);
        const res = await fetch(`/api/scholarship/applications/${applicationId}/documents`, {
          method: "POST",
          body,
        });
        const data = (await res.json().catch(() => null)) as
          | { document?: WizardDocument; error?: string }
          | null;
        if (!res.ok || !data?.document) {
          throw new Error(data?.error ?? `Could not upload ${file.name}.`);
        }
        onDocumentsChanged([...everything, { ...data.document, verifiedAt: null }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Could not upload ${file.name}.`);
      } finally {
        setUploading((state) => state.filter((name) => name !== file.name));
      }
    }
  }

  async function removeDocument(document: WizardDocument) {
    setError(null);
    try {
      const res = await fetch(`/api/scholarship/documents/${document.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not remove that file.");
      }
      onDocumentsChanged(everything.filter((d) => d.id !== document.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that file.");
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-base text-primary">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{COPY.documentsHint}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingImportedDocuments.length > 0 ? (
          <Alert>
            <TriangleAlert className="size-4" />
            <AlertTitle>Please upload these again</AlertTitle>
            <AlertDescription>
              We keep supporting documents for a limited time and then delete them, so{" "}
              {missingImportedDocuments.join(", ")}{" "}
              {missingImportedDocuments.length === 1 ? "is" : "are"} no longer on file. Sorry to ask
              twice.
            </AlertDescription>
          </Alert>
        ) : null}

        {!readOnly && kinds.length > 1 ? (
          <div className="max-w-md space-y-1.5">
            <Label htmlFor={"doc-kind-" + title}>What are you uploading?</Label>
            <Select
              value={effectiveKind}
              onValueChange={(v) => {
                setKind(String(v ?? "other"));
                setKindTouched(true);
              }}
            >
              <SelectTrigger id={"doc-kind-" + title} className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kinds.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {!readOnly ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <FileUp className="mx-auto size-7 text-muted-foreground" aria-hidden />
            <p className="mt-2 font-medium text-foreground">Drag files here</p>
            <p className="text-sm text-muted-foreground">Or pick them from your device.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => inputRef.current?.click()}
            >
              Choose files
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,application/pdf"
              className="sr-only"
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        ) : null}

        {/* Families handing over a child's disability records deserve to be told
            what happens to them. */}
        <p className="text-xs text-muted-foreground">{RETENTION_NOTICE}</p>

        {uploading.length > 0 ? (
          <ul className="space-y-1 text-sm text-muted-foreground" role="status" aria-live="polite">
            {uploading.map((name) => (
              <li key={name}>Uploading {name}…</li>
            ))}
          </ul>
        ) : null}

        {documents.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {documents.map((document) => (
              <li key={document.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{document.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_KINDS.find((k) => k.value === document.documentKind)?.label ?? "Document"} ·{" "}
                    {formatBytes(document.fileSize)}
                    {document.verifiedAt ? " · verified by our team" : ""}
                  </p>
                </div>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => void removeDocument(document)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    <span className="sr-only">Remove {document.fileName}</span>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : needsDocs || emptyText ? (
          <p className="text-sm text-muted-foreground">
            {emptyText ??
              "Nothing attached yet. You can still submit and send documentation later — we just can't count the Overflow qualification until it's on file."}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
