"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Action = "approve" | "deny" | "request_info" | "send_to_dcs" | "note" | null;

/**
 * Reviewer actions on a disability or displacement verification: the same
 * Claim, Approve, Request info, Deny and Note as applications, plus Send to
 * DCS for displacement. Internal notes and messages to the family are kept in
 * separate fields.
 */
export function VerificationPanel({
  verificationId,
  kind,
  status,
  claimedByMe,
  claimedBy,
  canDecide,
  dcsReference,
}: {
  verificationId: string;
  kind: "disability" | "displacement";
  status: string;
  claimedByMe: boolean;
  claimedBy: string | null;
  canDecide: boolean;
  dcsReference: string | null;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action>(null);
  const [internalNote, setInternalNote] = useState("");
  const [parentMessage, setParentMessage] = useState("");
  const [documentSummary, setDocumentSummary] = useState("");
  const [dcs, setDcs] = useState(dcsReference ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const decided = status === "approved" || status === "denied" || status === "withdrawn";

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/verifications/${verificationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res.ok) {
      setError(data?.error ?? "Not recorded.");
      return;
    }
    setAction(null);
    setInternalNote("");
    setParentMessage("");
    router.refresh();
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-base text-primary">Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!claimedByMe && !decided ? (
          <Button type="button" size="sm" variant="outline" disabled={busy || Boolean(claimedBy)} onClick={() => void send({ action: "claim" })}>
            {claimedBy ? `Claimed by ${claimedBy}` : "Claim this verification"}
          </Button>
        ) : null}

        {canDecide && !decided ? (
          <div className="flex flex-wrap gap-2">
            {kind === "displacement" && status !== "awaiting_dcs" ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setAction("send_to_dcs")}>
                Send to DCS
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={() => setAction("approve")}>
              Approve
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAction("request_info")}>
              Request info
            </Button>
            <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => setAction("deny")}>
              Deny
            </Button>
          </div>
        ) : null}
        <Button type="button" size="sm" variant="ghost" onClick={() => setAction("note")}>
          Add a note
        </Button>

        {action === "send_to_dcs" ? (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-muted-foreground">
              Confirm the signed form is complete, then send it to the Department of Child Safety outside the app. Record
              how and when below.
            </p>
            <Label htmlFor="dcs-ref">DCS reference (optional)</Label>
            <Input id="dcs-ref" value={dcs} onChange={(e) => setDcs(e.target.value)} />
            <Textarea placeholder="Internal note: how it was sent" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
            <Button type="button" size="sm" disabled={busy} onClick={() => void send({ action: "send_to_dcs", dcsReference: dcs, internalNote })}>
              Mark sent to DCS
            </Button>
          </div>
        ) : null}

        {action === "approve" ? (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label htmlFor="doc-summary">
              {kind === "displacement" ? "What DCS confirmed" : "What the document showed"} (kept after the file is deleted)
            </Label>
            <Textarea
              id="doc-summary"
              placeholder={kind === "displacement" ? "e.g. DCS confirmed placement under Title 8, 2019-2021" : "e.g. IEP from Mesa Public Schools dated 3/2026, specific learning disability"}
              value={documentSummary}
              onChange={(e) => setDocumentSummary(e.target.value)}
            />
            {kind === "displacement" ? (
              <>
                <Label htmlFor="dcs-ref-2">DCS reference</Label>
                <Input id="dcs-ref-2" value={dcs} onChange={(e) => setDcs(e.target.value)} />
              </>
            ) : null}
            <Textarea placeholder="Internal note (optional)" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
            <Button type="button" size="sm" disabled={busy} onClick={() => void send({ action: "approve", documentSummary, dcsReference: dcs, internalNote })}>
              Record approval
            </Button>
          </div>
        ) : null}

        {action === "request_info" || action === "deny" ? (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label htmlFor="to-family">Message to the family (sent as written)</Label>
            <Textarea id="to-family" value={parentMessage} onChange={(e) => setParentMessage(e.target.value)} />
            <Textarea placeholder="Internal note (never shown to the family)" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
            <Button
              type="button"
              size="sm"
              variant={action === "deny" ? "destructive" : "default"}
              disabled={busy}
              onClick={() => void send({ action, parentMessage, internalNote })}
            >
              {action === "deny" ? "Record denial" : "Send request"}
            </Button>
          </div>
        ) : null}

        {action === "note" ? (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Textarea placeholder="Internal note" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
            <Button type="button" size="sm" disabled={busy} onClick={() => void send({ action: "note", internalNote })}>
              Save note
            </Button>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
