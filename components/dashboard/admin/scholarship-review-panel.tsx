"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APPLICATION_STEPS, NEEDS_INFO_DAYS } from "@/lib/scholarship/constants";

type Decision = "approve" | "deny" | "request_info" | "reopen" | "note" | null;

/**
 * The reviewer's action panel.
 *
 * `internalNote` and `parentMessage` are separate inputs, labelled
 * unambiguously, because one combined field guarantees that internal
 * commentary eventually reaches a family.
 */
export function ReviewPanel({
  applicationId,
  status,
  claimedBy,
  actorProfileId,
  needsInfoDueAt,
  hasOverflowClaim,
  qualificationTitle,
  documentCount,
  canDecide,
  canReopen,
  locked,
}: {
  applicationId: string;
  status: string;
  claimedBy: string | null;
  actorProfileId: string | null;
  needsInfoDueAt: string | null;
  hasOverflowClaim: boolean;
  qualificationTitle: string | null;
  documentCount: number;
  canDecide: boolean;
  canReopen: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision>(null);
  const [internalNote, setInternalNote] = useState("");
  const [parentMessage, setParentMessage] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [overflowVerified, setOverflowVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mine = claimedBy && actorProfileId && claimedBy === actorProfileId;
  const isOpen = ["submitted", "under_review", "needs_info"].includes(status);

  async function send(action: string, extra: Record<string, unknown> = {}) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/scholarships/${applicationId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, internalNote, parentMessage, ...extra }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Could not record that.");
      setDecision(null);
      setInternalNote("");
      setParentMessage("");
      setSections([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record that.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-base text-primary">Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canDecide ? (
          <Alert>
            <AlertDescription>
              Your account can read applications but not decide them.
            </AlertDescription>
          </Alert>
        ) : null}

        {isOpen && !claimedBy ? (
          <Button type="button" variant="outline" onClick={() => void send("claim")} disabled={pending}>
            Claim this application
          </Button>
        ) : null}

        {claimedBy && !mine ? (
          <Alert>
            <AlertDescription>
              Someone else has claimed this one. You can still act on it, but check with them first.
            </AlertDescription>
          </Alert>
        ) : null}

        {needsInfoDueAt ? (
          <Alert>
            <AlertDescription>
              Waiting on the family. Reply due{" "}
              {new Date(needsInfoDueAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              . If it passes with no reply, this comes back to the queue flagged — never denied
              automatically.
            </AlertDescription>
          </Alert>
        ) : null}

        {canDecide && isOpen ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={decision === "approve" ? "default" : "outline"}
              onClick={() => setDecision(decision === "approve" ? null : "approve")}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant={decision === "request_info" ? "default" : "outline"}
              onClick={() => setDecision(decision === "request_info" ? null : "request_info")}
            >
              Request info
            </Button>
            <Button
              type="button"
              size="sm"
              variant={decision === "deny" ? "destructive" : "outline"}
              onClick={() => setDecision(decision === "deny" ? null : "deny")}
            >
              Deny
            </Button>
            <Button
              type="button"
              size="sm"
              variant={decision === "note" ? "default" : "outline"}
              onClick={() => setDecision(decision === "note" ? null : "note")}
            >
              Add a note
            </Button>
          </div>
        ) : null}

        {canReopen && locked && !isOpen ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDecision(decision === "reopen" ? null : "reopen")}
          >
            Reopen for the family
          </Button>
        ) : null}

        {decision === "approve" ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <Alert>
              <AlertDescription>
                Approval means the application is complete and the student is eligible to be
                considered. It sets no amount and reserves no funds — the family&apos;s email says
                so explicitly.
              </AlertDescription>
            </Alert>

            {hasOverflowClaim ? (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="overflow-verified"
                  checked={overflowVerified}
                  onCheckedChange={(checked) => setOverflowVerified(checked === true)}
                />
                <Label htmlFor="overflow-verified" className="font-normal leading-snug">
                  I&apos;ve verified the Overflow qualification “{qualificationTitle}”
                  {documentCount === 0 ? " (no documents are attached)" : ""}. Ticking this writes
                  the verified finding to the student&apos;s record for this school year.
                </Label>
              </div>
            ) : null}

            <InternalNoteField value={internalNote} onChange={setInternalNote} />

            <Button
              type="button"
              onClick={() => void send("approve", { overflowVerified })}
              disabled={pending}
            >
              {pending ? "Recording…" : "Record approval"}
            </Button>
          </div>
        ) : null}

        {decision === "request_info" ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">
                Which sections should reopen?
              </legend>
              <p className="text-sm text-muted-foreground">
                Everything else stays locked for the family.
              </p>
              {APPLICATION_STEPS.filter((s) => s.id !== "review").map((step) => (
                <div key={step.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`section-${step.id}`}
                    checked={sections.includes(step.id)}
                    onCheckedChange={(checked) =>
                      setSections((state) =>
                        checked === true
                          ? [...state, step.id]
                          : state.filter((s) => s !== step.id),
                      )
                    }
                  />
                  <Label htmlFor={`section-${step.id}`} className="font-normal">
                    {step.full}
                  </Label>
                </div>
              ))}
            </fieldset>

            <ParentMessageField
              value={parentMessage}
              onChange={setParentMessage}
              hint={`They get ${NEEDS_INFO_DAYS} days, and the email states the actual date.`}
            />
            <InternalNoteField value={internalNote} onChange={setInternalNote} />

            <Button
              type="button"
              onClick={() => void send("request_info", { fieldsRequested: sections })}
              disabled={pending || !parentMessage.trim()}
            >
              {pending ? "Sending…" : "Send the request"}
            </Button>
          </div>
        ) : null}

        {decision === "deny" ? (
          <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
            <Alert>
              <AlertDescription>
                A denial is final for this application. The family can start a new attempt while the
                window is open, and their email will tell them so.
              </AlertDescription>
            </Alert>
            <ParentMessageField
              value={parentMessage}
              onChange={setParentMessage}
              hint="Required. A denial with no explanation generates a phone call every time."
            />
            <InternalNoteField value={internalNote} onChange={setInternalNote} />
            <Button
              type="button"
              variant="destructive"
              onClick={() => void send("deny")}
              disabled={pending || !parentMessage.trim()}
            >
              {pending ? "Recording…" : "Record denial"}
            </Button>
          </div>
        ) : null}

        {decision === "reopen" ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <ParentMessageField
              value={parentMessage}
              onChange={setParentMessage}
              hint="Optional. Tell them what to change and by when."
            />
            <InternalNoteField value={internalNote} onChange={setInternalNote} />
            <Button type="button" onClick={() => void send("reopen")} disabled={pending}>
              {pending ? "Reopening…" : "Unlock for the family"}
            </Button>
          </div>
        ) : null}

        {decision === "note" ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <InternalNoteField value={internalNote} onChange={setInternalNote} />
            <Button
              type="button"
              onClick={() => void send("note")}
              disabled={pending || !internalNote.trim()}
            >
              {pending ? "Saving…" : "Save note"}
            </Button>
          </div>
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

function ParentMessageField({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  hint: string;
}) {
  return (
    <div>
      <Label htmlFor="parent-message">Message to the family</Label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Sent to them word for word. {hint}
      </p>
      <Textarea
        id="parent-message"
        className="mt-1.5 min-h-28"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function InternalNoteField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor="internal-note">Internal note</Label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Staff only. Never shown to the family, in any screen or email.
      </p>
      <Textarea
        id="internal-note"
        className="mt-1.5 min-h-20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
