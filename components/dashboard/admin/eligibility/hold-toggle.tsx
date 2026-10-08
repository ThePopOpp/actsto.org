"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Place or lift a legal hold on one stored file. */
export function HoldToggle({ documentId, held }: { documentId: string; held: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    const reason = held ? "" : window.prompt("Why should this file be kept past its retention date? (audit, dispute…)") ?? "";
    if (!held && !reason.trim()) return;
    const res = await fetch(`/api/admin/documents/${documentId}/hold`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hold: !held, reason }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) setError(data?.error ?? "Not saved.");
    else router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => void toggle()}>
        {held ? "Lift hold" : "Place hold"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
