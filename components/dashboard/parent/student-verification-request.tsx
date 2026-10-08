"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DISPLACED_FORM_URL } from "@/lib/scholarship/constants";
import { DISPLACED_RETENTION_NOTICE, RETENTION_NOTICE } from "@/lib/scholarship/retention-copy";

/**
 * Mark a student disabled or displaced from the student profile. It goes to
 * review with the uploaded document; the student isn't eligible until it's
 * approved.
 */
export function StudentVerificationRequest({
  studentId,
  studentName,
  kind,
  displacedDefinition,
  existingVerificationId,
  label,
}: {
  studentId: string;
  studentName: string;
  kind: "disability" | "displacement";
  displacedDefinition: string;
  /** Upload to an open verification instead of starting a new one. */
  existingVerificationId?: string | null;
  label: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      let verificationId = existingVerificationId ?? null;
      if (!verificationId) {
        const res = await fetch(`/api/parent/students/${studentId}/verifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, note }),
        });
        const data = (await res.json().catch(() => null)) as { verificationId?: string; error?: string } | null;
        if (!res.ok || !data?.verificationId) throw new Error(data?.error ?? "We couldn't send that. Try again.");
        verificationId = data.verificationId;
      }
      if (file) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(`/api/parent/verifications/${verificationId}/documents`, { method: "POST", body });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) throw new Error(data?.error ?? "Your request was sent, but the file didn't upload. Try the upload again.");
      }
      setOpen(false);
      setFile(null);
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open ? (
        <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-primary">
                {kind === "disability" ? `${studentName} has a disability` : `${studentName} is a displaced student`}
              </DialogTitle>
              <DialogDescription>
                Our review team checks this before it counts toward any scholarship. You&apos;ll get an email when it&apos;s
                decided.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              {kind === "disability" ? (
                <p className="text-muted-foreground">
                  Upload the MET, IEP or 504 plan from an Arizona public school (or preschool services documentation for
                  a preschooler).
                </p>
              ) : (
                <div className="space-y-2 text-muted-foreground">
                  <p>{displacedDefinition}</p>
                  <p>
                    <a href={DISPLACED_FORM_URL} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
                      Download the Displaced Student Verification Form
                    </a>
                    , sign it, and upload it here. We confirm placement with the Arizona Department of Child Safety, once
                    for all of K-12.
                  </p>
                  <p className="font-medium text-foreground">Do not upload court documents, case files or emails with caseworkers.</p>
                </div>
              )}
              <div>
                <Label htmlFor={`ver-file-${kind}`}>{kind === "disability" ? "Document" : "Signed verification form"}</Label>
                <input
                  ref={fileRef}
                  id={`ver-file-${kind}`}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="mt-1.5 block w-full text-sm"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {!existingVerificationId ? (
                <div>
                  <Label htmlFor={`ver-note-${kind}`}>Anything we should know (optional)</Label>
                  <Textarea id={`ver-note-${kind}`} className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">{kind === "displacement" ? DISPLACED_RETENTION_NOTICE : RETENTION_NOTICE}</p>
              {error ? (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="button" disabled={busy || (Boolean(existingVerificationId) && !file)} onClick={() => void submit()}>
                {busy ? "Sending…" : existingVerificationId ? "Upload" : "Send for review"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
