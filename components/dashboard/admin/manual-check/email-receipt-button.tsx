"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Email a generated receipt that hasn't been sent yet. */
export function EmailReceiptButton({ receiptId }: { receiptId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="ml-3 inline-flex flex-col">
      <button
        type="button"
        disabled={busy}
        className="text-primary underline underline-offset-2 disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch(`/api/admin/receipts/${receiptId}/email`, { method: "POST" });
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setBusy(false);
          if (!res.ok) setError(data?.error ?? "Not sent.");
          else router.refresh();
        }}
      >
        {busy ? "Sending…" : "Email"}
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
