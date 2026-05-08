"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function AdminPaypalReceiptBackfillButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runBackfill() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/paypal/receipts/backfill", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { created?: number; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not generate receipts.");
      setMessage(`Generated ${data?.created ?? 0} receipt${data?.created === 1 ? "" : "s"}.`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not generate receipts.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" size="sm" onClick={() => void runBackfill()} disabled={loading}>
        {loading ? "Generating..." : "Generate missing receipts"}
      </Button>
      {message ? <span className="text-sm text-muted-foreground">{message}</span> : null}
    </div>
  );
}
