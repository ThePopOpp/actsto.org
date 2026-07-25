"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, EyeOff, MessageSquare, RefreshCw, Send, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ThreadMessage = {
  id: string;
  direction: string;
  message: string;
  status: string | null;
  errorMessage: string | null;
  createdAt: string;
};
type Thread = {
  phone: string;
  contactName: string | null;
  roleType: string | null;
  campaignTitle: string | null;
  lastMessage: string;
  lastAt: string;
  lastDirection: string;
  total: number;
  needsReply: boolean;
  messages: ThreadMessage[];
};
type Runtime = { ready: boolean; sender: string };

function dt(v: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(v));
}

export function SmsInboxAccordion() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "needsReply" | "campaign">("all");
  const [openPhone, setOpenPhone] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/sms/threads", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { runtime?: Runtime; threads?: Thread[] } | null;
    if (res.ok && data) {
      setThreads(data.threads ?? []);
      setRuntime(data.runtime ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function sendReply(phone: string) {
    if (!reply.trim()) return;
    setBusy(true);
    await fetch("/api/admin/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, message: reply }),
    });
    setReply("");
    setBusy(false);
    await load();
  }

  async function act(phone: string, action: "hide" | "delete") {
    if (action === "delete" && !window.confirm("Delete this entire conversation?")) return;
    setBusy(true);
    await fetch("/api/admin/sms/threads/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, action }),
    });
    setOpenPhone(null);
    setBusy(false);
    await load();
  }

  const filtered = useMemo(() => threads.filter((t) => {
    if (filter === "needsReply") return t.needsReply;
    if (filter === "campaign") return Boolean(t.campaignTitle);
    return true;
  }), [threads, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {([["all", "All"], ["needsReply", "Needs reply"], ["campaign", "Campaign"]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", filter === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {runtime ? <span className={cn("text-xs", runtime.ready ? "text-emerald-600" : "text-destructive")}>Twilio {runtime.ready ? "ready" : "not configured"}</span> : null}
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 size-4", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><MessageSquare className="mx-auto mb-2 size-6 opacity-50" />No conversations yet. Inbound texts to your Twilio number appear here.</p>
      ) : (
        <Card className="border-border/80">
          <CardContent className="divide-y divide-border/60 p-0">
            {filtered.map((t) => {
              const open = openPhone === t.phone;
              return (
                <div key={t.phone}>
                  <button type="button" onClick={() => { setOpenPhone(open ? null : t.phone); setReply(""); }} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/20">
                    <div className={cn("size-2 shrink-0 rounded-full", t.needsReply ? "bg-act-red" : "bg-transparent")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("truncate text-sm", t.needsReply ? "font-semibold text-foreground" : "text-foreground")}>{t.contactName ?? t.phone}</span>
                        {t.contactName ? <span className="hidden text-xs text-muted-foreground sm:inline">{t.phone}</span> : null}
                        {t.campaignTitle ? <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">{t.campaignTitle}</Badge> : null}
                        <Badge variant="secondary" className="text-[10px]">{t.total}</Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{t.lastDirection === "inbound" ? "" : "You: "}{t.lastMessage}</p>
                    </div>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{dt(t.lastAt)}</span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                  </button>
                  {open ? (
                    <div className="border-t border-border/60 bg-muted/10 px-4 py-3">
                      <div className="mb-3 max-h-80 space-y-2 overflow-auto">
                        {t.messages.map((m) => {
                          const outbound = m.direction !== "inbound";
                          return (
                            <div key={m.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", outbound ? "bg-primary text-primary-foreground" : "bg-background border border-border text-foreground")}>
                                <p className="whitespace-pre-wrap">{m.message}</p>
                                <p className={cn("mt-1 text-[10px]", outbound ? "text-primary-foreground/70" : "text-muted-foreground")}>{dt(m.createdAt)}{m.status ? ` · ${m.status}` : ""}</p>
                                {m.errorMessage ? <p className="mt-0.5 text-[10px] text-destructive">{m.errorMessage}</p> : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-end gap-2">
                        <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={runtime?.ready ? "Type a reply…" : "Twilio not configured"} disabled={!runtime?.ready} className="min-h-[44px] flex-1" />
                        <Button type="button" size="sm" onClick={() => void sendReply(t.phone)} disabled={busy || !reply.trim() || !runtime?.ready}><Send className="mr-1.5 size-3.5" /> Reply</Button>
                      </div>
                      <div className="mt-2 flex justify-end gap-1.5">
                        <Button type="button" size="sm" variant="outline" onClick={() => void act(t.phone, "hide")} disabled={busy}><EyeOff className="mr-1.5 size-3.5" /> Hide</Button>
                        <Button type="button" size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => void act(t.phone, "delete")} disabled={busy}><Trash2 className="mr-1.5 size-3.5" /> Delete</Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
