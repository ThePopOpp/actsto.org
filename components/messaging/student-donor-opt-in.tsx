"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function StudentDonorOptIn() {
  const [allow, setAllow] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/messages/student-opt-in", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { allow?: boolean } | null;
      if (res.ok && data) setAllow(Boolean(data.allow));
    })();
  }, []);

  async function toggle() {
    if (allow === null || busy) return;
    setBusy(true);
    const next = !allow;
    setAllow(next);
    const res = await fetch("/api/messages/student-opt-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allow: next }),
    });
    if (!res.ok) setAllow(!next);
    setBusy(false);
  }

  if (allow === null) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">Allow donors to message me</p>
          <p className="text-xs text-muted-foreground">When off, donors can&apos;t start a conversation with you. You can always message parents/guardians.</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={allow}
        onClick={() => void toggle()}
        disabled={busy}
        className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", allow ? "bg-primary" : "bg-muted-foreground/30")}
      >
        <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", allow ? "translate-x-5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}
