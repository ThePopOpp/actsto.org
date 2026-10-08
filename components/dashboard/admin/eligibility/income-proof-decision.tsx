"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Accept, reject or ask for more income proof; then re-run the low-income check. */
export function IncomeProofDecision({ applicationId, canDecide }: { applicationId: string; canDecide: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function decide(decision: "accepted" | "rejected" | "needs_more") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/scholarships/${applicationId}/income-proof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res.ok) {
      setError(data?.error ?? "Not saved.");
      return;
    }
    setNote("");
    router.refresh();
  }

  async function recalculate() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "recalculate_low_income", applicationId }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res.ok) setError(data?.error ?? "Could not recalculate.");
    else router.refresh();
  }

  if (!canDecide) return null;
  return (
    <div className="space-y-2">
      <Textarea
        aria-label="Note to the family (required to reject or ask for more)"
        placeholder="Note to the family (required to reject or ask for more)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => void decide("accepted")}>
          Accept proof
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void decide("needs_more")}>
          Needs more
        </Button>
        <Button type="button" size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={() => void decide("rejected")}>
          Reject
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void recalculate()}>
          Recalculate low-income
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
