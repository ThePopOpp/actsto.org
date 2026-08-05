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
import {
  AWARDING_ORGANIZATIONS,
  COPY,
  DOCUMENT_MAX_BYTES,
  OVERFLOW_QUALIFICATIONS,
  overflowBySlug,
} from "@/lib/scholarship/constants";
import { RETENTION_NOTICE } from "@/lib/scholarship/retention-copy";
import type { ValidationIssue } from "@/lib/scholarship/validation";
import { cn } from "@/lib/utils";

export function OverflowStep({
  applicationId,
  values,
  onPatch,
  documents,
  onDocumentsChanged,
  missingImportedDocuments,
  issues,
  readOnly,
}: {
  applicationId: string;
  values: WizardValues;
  onPatch: (patch: Partial<WizardValues>) => void;
  documents: WizardDocument[];
  onDocumentsChanged: (documents: WizardDocument[]) => void;
  missingImportedDocuments: string[];
  issues: ValidationIssue[];
  readOnly: boolean;
}) {
  const issueFor = useFieldIssue(issues);
  const selected = overflowBySlug(values.overflowQualification);

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

      <DocumentUploader
        applicationId={applicationId}
        documents={documents}
        onDocumentsChanged={onDocumentsChanged}
        missingImportedDocuments={missingImportedDocuments}
        readOnly={readOnly}
        needsDocs={selected?.needsDocs === true}
      />
    </div>
  );
}

// ── Uploads ──────────────────────────────────────────────────────────────────

function DocumentUploader({
  applicationId,
  documents,
  onDocumentsChanged,
  missingImportedDocuments,
  readOnly,
  needsDocs,
}: {
  applicationId: string;
  documents: WizardDocument[];
  onDocumentsChanged: (documents: WizardDocument[]) => void;
  missingImportedDocuments: string[];
  readOnly: boolean;
  needsDocs: boolean;
}) {
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
        onDocumentsChanged([...documents, { ...data.document, verifiedAt: null }]);
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
      onDocumentsChanged(documents.filter((d) => d.id !== document.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that file.");
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-base text-primary">Supporting documents</CardTitle>
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
        ) : needsDocs ? (
          <p className="text-sm text-muted-foreground">
            Nothing attached yet. You can still submit and send documentation later — we just
            can&apos;t count the Overflow qualification until it&apos;s on file.
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
