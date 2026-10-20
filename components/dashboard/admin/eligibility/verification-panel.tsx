"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  disabilityApprovalError,
  DISABILITY_DOCUMENT_TYPES,
  PRESCHOOL_QUALIFYING,
  SPED_CATEGORIES,
  spedLabel,
  type DisabilityChecklist,
} from "@/lib/award-policy/disability";

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
  isUpdate = false,
  defaultGradeBand = "",
  checklist,
  matrixCodes = [],
}: {
  verificationId: string;
  kind: "disability" | "displacement";
  status: string;
  claimedByMe: boolean;
  claimedBy: string | null;
  canDecide: boolean;
  dcsReference: string | null;
  /** An updated plan for a student who is already verified. */
  isUpdate?: boolean;
  defaultGradeBand?: "preschool" | "k12" | "";
  /** What was recorded on a decided verification. */
  checklist?: DisabilityChecklist;
  /** Codes used in the state aid matrix (e.g. OIR, SID-SC), offered for K-12 so the cap finds its row. */
  matrixCodes?: string[];
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action>(null);
  const [internalNote, setInternalNote] = useState("");
  const [parentMessage, setParentMessage] = useState("");
  const [documentSummary, setDocumentSummary] = useState("");
  const [dcs, setDcs] = useState(dcsReference ?? "");
  const [check, setCheck] = useState({
    documentType: checklist?.documentType ?? "",
    issuedByAzPublic: checklist?.issuedByAzPublic ?? null,
    disabilityNamed: checklist?.disabilityNamed ?? "",
    spedCategory: checklist?.spedCategory ?? "",
    gradeBand: checklist?.gradeBand ?? defaultGradeBand,
  } as { documentType: string; issuedByAzPublic: boolean | null; disabilityNamed: string; spedCategory: string; gradeBand: string });
  const checklistProblem = kind === "disability" ? disabilityApprovalError(check) : null;
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
        {isUpdate ? (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            This student is already verified. Approving updates the stored document details and category; denying or
            asking for more leaves the current eligibility as it is.
          </p>
        ) : null}
        {decided && kind === "disability" && checklist?.documentType ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border border-border/60 p-3 text-xs">
            <dt className="text-muted-foreground">Document</dt>
            <dd>{checklist.documentType}</dd>
            <dt className="text-muted-foreground">Arizona public school</dt>
            <dd>{checklist.issuedByAzPublic ? "Yes" : "No"}</dd>
            <dt className="text-muted-foreground">Disability named</dt>
            <dd>{checklist.disabilityNamed || "—"}</dd>
            <dt className="text-muted-foreground">SPED category</dt>
            <dd>{checklist.documentType === "504" ? "Regular education (504 plan)" : spedLabel(checklist.spedCategory)}</dd>
            <dt className="text-muted-foreground">Grade band</dt>
            <dd>{checklist.gradeBand === "preschool" ? "Preschool" : checklist.gradeBand === "k12" ? "K-12" : "—"}</dd>
          </dl>
        ) : null}
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
            {kind === "disability" ? (
              <div className="space-y-2 rounded-md bg-muted/30 p-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Reviewer checklist</p>
                <div>
                  <Label htmlFor="chk-doc" className="text-xs">Document type</Label>
                  <select
                    id="chk-doc"
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2"
                    value={check.documentType}
                    onChange={(e) => setCheck({ ...check, documentType: e.target.value, spedCategory: e.target.value === "504" ? "" : check.spedCategory })}
                  >
                    <option value="">Choose…</option>
                    {DISABILITY_DOCUMENT_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <fieldset className="text-xs">
                  <legend>Issued by an Arizona public school or district?</legend>
                  <div className="mt-1 flex gap-4">
                    <label className="flex items-center gap-1.5">
                      <input type="radio" name="chk-az" checked={check.issuedByAzPublic === true} onChange={() => setCheck({ ...check, issuedByAzPublic: true })} /> Yes
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="radio" name="chk-az" checked={check.issuedByAzPublic === false} onChange={() => setCheck({ ...check, issuedByAzPublic: false })} /> No (deny)
                    </label>
                  </div>
                </fieldset>
                <div>
                  <Label htmlFor="chk-named" className="text-xs">Disability named in the document</Label>
                  <Input id="chk-named" className="mt-1" value={check.disabilityNamed} onChange={(e) => setCheck({ ...check, disabilityNamed: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="chk-band" className="text-xs">Grade band at verification</Label>
                  <select id="chk-band" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2" value={check.gradeBand} onChange={(e) => setCheck({ ...check, gradeBand: e.target.value })}>
                    <option value="">Choose…</option>
                    <option value="preschool">Preschool</option>
                    <option value="k12">K-12</option>
                  </select>
                </div>
                {check.documentType !== "504" ? (
                  <div>
                    <Label htmlFor="chk-sped" className="text-xs">Special education category (SPED code)</Label>
                    <select id="chk-sped" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2" value={check.spedCategory} onChange={(e) => setCheck({ ...check, spedCategory: e.target.value })}>
                      <option value="">Choose…</option>
                      {SPED_CATEGORIES.filter((c) => c.code !== "REG")
                        .filter((c) => check.gradeBand !== "preschool" || PRESCHOOL_QUALIFYING.includes(c.code))
                        .map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label} ({c.code})
                          </option>
                        ))}
                      {check.gradeBand !== "preschool"
                        ? matrixCodes
                            .filter((code) => code !== "REG" && !SPED_CATEGORIES.some((c) => c.code === code))
                            .map((code) => (
                              <option key={code} value={code}>
                                {code} (from the state aid matrix)
                              </option>
                            ))
                        : null}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">504 plans use the regular education row of the state aid matrix.</p>
                )}
                <p className="text-xs text-muted-foreground">Current or expired documents are both fine.</p>
                {checklistProblem ? <p className="text-xs text-amber-700 dark:text-amber-400">{checklistProblem}</p> : null}
              </div>
            ) : null}
            {kind === "displacement" ? (
              <>
                <Label htmlFor="dcs-ref-2">DCS reference</Label>
                <Input id="dcs-ref-2" value={dcs} onChange={(e) => setDcs(e.target.value)} />
              </>
            ) : null}
            <Textarea placeholder="Internal note (optional)" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
            <Button
              type="button"
              size="sm"
              disabled={busy || Boolean(checklistProblem)}
              onClick={() => void send({ action: "approve", documentSummary, dcsReference: dcs, internalNote, ...(kind === "disability" ? check : {}) })}
            >
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
