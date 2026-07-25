"use client";

import { useCallback, useEffect, useState } from "react";
import { Delete, Loader2, Phone, PhoneCall, PhoneOutgoing, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CallRow = {
  id: string;
  contactName: string | null;
  toPhone: string;
  direction: string;
  status: string | null;
  errorMessage: string | null;
  durationSeconds: number | null;
  campaignTitle: string | null;
  notes: string | null;
  createdAt: string;
};
type Runtime = { ready: boolean; hasPhoneNumber?: boolean; sender: string };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const CALLBACK_STORAGE = "actsto.dialer.callback";

function dt(v: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(v));
}
function dur(s: number | null) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function DialerPanel() {
  const [number, setNumber] = useState("");
  const [callback, setCallback] = useState("");
  const [notes, setNotes] = useState("");
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/dialer/calls", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { runtime?: Runtime; calls?: CallRow[] } | null;
    if (res.ok && data) {
      setRuntime(data.runtime ?? null);
      setCalls(data.calls ?? []);
    }
  }, []);

  useEffect(() => {
    setCallback(window.localStorage.getItem(CALLBACK_STORAGE) ?? "");
    void load();
  }, [load]);

  function saveCallback(value: string) {
    setCallback(value);
    window.localStorage.setItem(CALLBACK_STORAGE, value);
  }

  const voiceReady = Boolean(runtime?.ready && runtime?.hasPhoneNumber);

  async function call() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/dialer/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: number, agentPhone: callback, notes }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; contactName?: string | null } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Could not place the call.");
      setNotice(`Calling ${data.contactName ?? number} — your phone (${callback}) will ring first, then connect.`);
      setNotes("");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not place the call.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="border-border/80">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-primary"><PhoneCall className="size-5" /><h2 className="font-heading text-lg">Dialer</h2></div>

          <div>
            <Label className="text-xs text-muted-foreground">Your call-back number</Label>
            <Input value={callback} onChange={(e) => saveCallback(e.target.value)} placeholder="(602) 555-0133" className="mt-1" />
            <p className="mt-1 text-[11px] text-muted-foreground">Twilio rings this number first, then connects you to the contact. Saved on this device.</p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Number to call</Label>
            <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="(602) 555-0100" className="mt-1 text-center text-lg tracking-wide" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <button key={k} type="button" onClick={() => setNumber((n) => n + k)} className="rounded-lg border border-border py-3 text-lg font-medium text-foreground transition-colors hover:bg-muted">{k}</button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setNumber((n) => n.slice(0, -1))} disabled={!number}><Delete className="mr-1.5 size-4" /> Delete</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setNumber("")} disabled={!number}>Clear</Button>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Call notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Why you're calling" />
          </div>

          {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p> : null}
          {!voiceReady ? <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">A voice-capable Twilio phone number is required for the dialer. Add one under Credentials.</p> : null}

          <Button type="button" onClick={() => void call()} disabled={busy || !number.trim() || !callback.trim() || !voiceReady} className="w-full">
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Phone className="mr-2 size-4" />} Call
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-base text-primary">Recent calls</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-1.5 size-4" /> Refresh</Button>
          </div>
          {calls.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No calls placed yet.</p>
          ) : (
            <div className="space-y-2">
              {calls.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/80 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <PhoneOutgoing className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-foreground">{c.contactName ?? c.toPhone}</p>
                        {c.campaignTitle ? <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">{c.campaignTitle}</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{dt(c.createdAt)}{dur(c.durationSeconds) ? ` · ${dur(c.durationSeconds)}` : ""}{c.notes ? ` · ${c.notes}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => setNumber(c.toPhone)} className="text-xs text-primary hover:underline">Redial</button>
                    <Badge variant={c.status === "failed" ? "destructive" : "outline"} className={cn("text-[10px]", c.status === "completed" && "text-emerald-600")}>{c.status ?? "queued"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
