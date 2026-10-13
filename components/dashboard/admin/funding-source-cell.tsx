"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FUNDING_SOURCE_LABEL, FUNDING_SOURCES, isFundingSource, type FundingSource } from "@/lib/funding-sources";

type Split = { fundingSource: string; amount: number; status: string };

function usd(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/**
 * The funding source(s) on one donation, with a correction dialog. The server
 * refuses changes once the money has been awarded.
 */
export function FundingSourceCell({ donationId, total, splits }: { donationId: string; total: number; splits: Split[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(splits.map((s) => ({ fundingSource: s.fundingSource, amount: String(s.amount) })));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const needsReview = splits.some((s) => s.status === "needs_review");

  async function send(body: unknown) {
    setError(null);
    const res = await fetch(`/api/admin/donations/${donationId}/funding`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "Not saved.");
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-1">
      {splits.length === 0 ? (
        <span className="text-xs text-muted-foreground">Not set</span>
      ) : (
        splits.map((s, i) => (
          <div key={i} className="text-xs">
            {isFundingSource(s.fundingSource) ? FUNDING_SOURCE_LABEL[s.fundingSource] : s.fundingSource}
            {splits.length > 1 ? <span className="text-muted-foreground"> · {usd(s.amount)}</span> : null}
          </div>
        ))
      )}
      <div className="flex flex-wrap items-center gap-1">
        {needsReview ? <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">Review</Badge> : null}
        <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => setOpen(true)}>
          Edit
        </button>
        {needsReview ? (
          <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => void send({ confirm: true })}>
            Confirm
          </button>
        ) : null}
      </div>
      {error && !open ? <p className="text-xs text-destructive">{error}</p> : null}

      {open ? (
        <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-primary">Funding source · {usd(total)}</DialogTitle>
              <DialogDescription>
                Split the gift across programs if needed. The parts must add up to the gift. Changes are logged and
                refused once the money has been awarded.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
                  <select
                    aria-label="Fund"
                    className="h-10 rounded-md border border-input bg-background px-2"
                    value={row.fundingSource}
                    onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, fundingSource: e.target.value } : r)))}
                  >
                    {/* "Unassigned program" is a placeholder for old business gifts, never a choice. */}
                    {FUNDING_SOURCES.filter((s) => s !== "corporate_other" || row.fundingSource === s).map((s: FundingSource) => (
                      <option key={s} value={s}>
                        {FUNDING_SOURCE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <Input
                    aria-label="Amount"
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))}
                  />
                  <Button type="button" variant="ghost" size="sm" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, { fundingSource: "individual_overflow", amount: "" }])}>
                Add a part
              </Button>
              <div>
                <Label htmlFor="fs-note">Note</Label>
                <Input id="fs-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why it changed" />
              </div>
              {error ? (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              ) : null}
              <Button
                type="button"
                onClick={async () => {
                  const ok = await send({
                    splits: rows.map((r) => ({ fundingSource: r.fundingSource, amount: Number(r.amount.replace(/[^0-9.]/g, "")) })),
                    note,
                  });
                  if (ok) setOpen(false);
                }}
              >
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

/** Cancel checkouts that were started and never paid. */
export function ExpirePendingButton({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  if (pendingCount === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={async () => {
          if (!window.confirm("Cancel every checkout that has been pending for more than 3 days without payment?")) return;
          const res = await fetch("/api/admin/donations/expire-pending", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ olderThanHours: 72 }),
          });
          const data = (await res.json().catch(() => null)) as { expired?: number; error?: string } | null;
          setMessage(res.ok ? `${data?.expired ?? 0} abandoned checkout(s) cancelled.` : data?.error ?? "Not done.");
          router.refresh();
        }}
      >
        Cancel abandoned checkouts
      </Button>
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
    </span>
  );
}
