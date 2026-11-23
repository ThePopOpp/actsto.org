"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CheckFormDialog } from "@/components/dashboard/admin/manual-check/record-check-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Row actions for a recorded check on Payments: edit, mark returned or void,
 * and the private scan of the check. Not shown for PayPal rows.
 */
export function ManualCheckActions({
  donationId,
  status,
  amountLabel,
  attachmentName,
  attachmentHold,
}: {
  donationId: string;
  status: string;
  amountLabel: string;
  attachmentName: string | null;
  attachmentHold: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [returning, setReturning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const paid = status === "paid";

  async function upload(file: File) {
    setMessage(null);
    const body = new FormData();
    body.set("file", file);
    const res = await fetch(`/api/admin/donations/manual/${donationId}/attachment`, { method: "POST", body });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setMessage(res.ok ? "Scan attached." : data?.error ?? "Upload failed.");
    if (res.ok) router.refresh();
  }

  async function toggleHold() {
    const res = await fetch(`/api/admin/donations/manual/${donationId}/attachment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hold: !attachmentHold }),
    });
    if (res.ok) router.refresh();
  }

  const link = "text-xs text-primary underline-offset-2 hover:underline";
  return (
    <div className="flex flex-col items-start gap-1">
      {paid ? (
        <>
          <button type="button" className={link} onClick={() => setEditing(true)}>
            Edit check
          </button>
          <button type="button" className="text-xs text-destructive underline-offset-2 hover:underline" onClick={() => setReturning(true)}>
            Mark returned or void
          </button>
        </>
      ) : null}
      {attachmentName ? (
        <span className="flex flex-wrap items-center gap-1.5">
          <a className={link} href={`/api/admin/donations/manual/${donationId}/attachment`} target="_blank" rel="noopener noreferrer">
            View scan
          </a>
          <button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => void toggleHold()}>
            {attachmentHold ? "On audit hold · release" : "Audit hold"}
          </button>
        </span>
      ) : null}
      {!attachmentHold ? (
        <>
          <button type="button" className={link} onClick={() => fileRef.current?.click()}>
            {attachmentName ? "Replace scan" : "Attach scan"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
        </>
      ) : null}
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}

      {editing ? <CheckFormDialog mode="edit" donationId={donationId} onClose={() => setEditing(false)} /> : null}
      {returning ? <ReturnDialog donationId={donationId} amountLabel={amountLabel} onClose={() => setReturning(false)} /> : null}
    </div>
  );
}

function ReturnDialog({ donationId, amountLabel, onClose }: { donationId: string; amountLabel: string; onClose: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<"returned" | "void">("returned");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Mark check returned or void · {amountLabel}</DialogTitle>
          <DialogDescription>
            Takes the gift out of every total, voids its receipt and removes it from the campaign. The record stays, with your reason, in the audit log.
            If its money has already been awarded, nothing changes until those awards are reversed on Allocation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2">
              <input type="radio" name="kind" checked={kind === "returned"} onChange={() => setKind("returned")} />
              Returned by the bank (NSF, stopped, closed account)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="kind" checked={kind === "void"} onChange={() => setKind("void")} />
              Void: recorded in error
            </label>
          </div>
          <div>
            <Label htmlFor="ret-reason">Reason *</Label>
            <Input id="ret-reason" className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Returned NSF, bank notice 3/4" />
          </div>
          {error ? (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={busy || !reason.trim()}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await fetch(`/api/admin/donations/manual/${donationId}/return`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ kind, reason }),
                });
                const data = (await res.json().catch(() => null)) as { error?: string } | null;
                setBusy(false);
                if (!res.ok) {
                  setError(data?.error ?? "Nothing was changed.");
                  return;
                }
                router.refresh();
                onClose();
              }}
            >
              {busy ? "Saving…" : kind === "returned" ? "Mark returned" : "Void check"}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
