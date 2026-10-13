"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

/**
 * Remove one donation, or every archived sandbox test, as test data. Asks for
 * a reason and a typed confirmation; the server keeps a copy of each row.
 */
export function RemoveTestDonationButton(
  props:
    | { mode: "one"; donationId: string; amount: number; label: string }
    | { mode: "archived"; count: number; amount: number },
) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(props.mode === "archived" ? "Pre-launch PayPal sandbox testing" : "Test donation");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (props.mode === "archived" && props.count === 0) return null;

  const what =
    props.mode === "one"
      ? `the ${usd(props.amount)} gift (${props.label})`
      : `${props.count} archived sandbox test donation${props.count === 1 ? "" : "s"} (${usd(props.amount)})`;

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/donations/remove-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        props.mode === "one" ? { donationIds: [props.donationId], reason } : { allArchived: true, reason },
      ),
    });
    const data = (await res.json().catch(() => null)) as { removed?: number; amount?: number; error?: string } | null;
    setBusy(false);
    if (!res.ok) {
      setError(data?.error ?? "Nothing was removed.");
      return;
    }
    setOpen(false);
    setDone(`Removed ${data?.removed ?? 0} test donation(s), ${usd(data?.amount ?? 0)}.`);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {props.mode === "one" ? (
        <button type="button" className="text-xs text-destructive underline-offset-2 hover:underline" onClick={() => setOpen(true)}>
          Remove test
        </button>
      ) : (
        <Button type="button" size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setOpen(true)}>
          Remove {props.count} archived sandbox test{props.count === 1 ? "" : "s"}
        </Button>
      )}
      {done ? <span className="text-xs text-muted-foreground">{done}</span> : null}

      {open ? (
        <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-primary">Remove test donation{props.mode === "one" ? "" : "s"}</DialogTitle>
              <DialogDescription>
                This permanently removes {what}, with its receipt, PayPal order and webhook records, fund split and
                allocations, from every total. Use it only for gifts that were never real money. A copy is kept for the
                audit trail.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <Label htmlFor="rt-reason">Reason</Label>
                <Input id="rt-reason" className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rt-confirm">Type REMOVE to confirm</Label>
                <Input id="rt-confirm" className="mt-1.5" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              </div>
              {error ? (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                disabled={busy || confirmText.trim().toUpperCase() !== "REMOVE" || !reason.trim()}
                onClick={() => void remove()}
              >
                {busy ? "Removing…" : "Remove permanently"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </span>
  );
}
