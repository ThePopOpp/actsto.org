"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, EyeOff, Flag, Loader2, Mail, RefreshCw, Reply, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  unread: boolean;
  flagged: boolean;
  campaignSlug: string | null;
  campaignTitle: string | null;
};

function dt(v: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(v));
}

export function EmailInboxAccordion() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "flagged" | "forms">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/email/inbox", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { messages?: Message[] } | null;
    if (res.ok && data) setMessages(data.messages ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function sync() {
    setSyncing(true);
    setNotice(null);
    const res = await fetch("/api/admin/email/inbox/sync", { method: "POST" });
    const data = (await res.json().catch(() => null)) as { error?: string; count?: number } | null;
    setSyncing(false);
    if (!res.ok) { setNotice(data?.error ?? "Sync failed. Check IMAP settings."); return; }
    setNotice(typeof data?.count === "number" ? `Synced — ${data.count} new.` : "Inbox synced.");
    await load();
  }

  async function act(m: Message, action: "hide" | "delete") {
    if (action === "delete" && !window.confirm("Delete this thread?")) return;
    if (action === "delete") await fetch(`/api/admin/email/inbox/${m.id}`, { method: "DELETE" });
    else await fetch(`/api/admin/email/inbox/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hidden: true }) });
    setOpenId(null);
    await load();
  }

  const filtered = useMemo(() => messages.filter((m) => {
    if (filter === "unread") return m.unread;
    if (filter === "flagged") return m.flagged;
    if (filter === "forms") return /form|contact|newsletter/i.test(m.subject);
    return true;
  }), [messages, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "unread", "flagged", "forms"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors", filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{f}</button>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void sync()} disabled={syncing}>
          {syncing ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <RefreshCw className="mr-1.5 size-4" />} Sync inbox
        </Button>
      </div>

      {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p> : null}

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><Mail className="mx-auto mb-2 size-6 opacity-50" />No messages. Click <strong>Sync inbox</strong> to pull from IMAP.</p>
      ) : (
        <Card className="border-border/80">
          <CardContent className="divide-y divide-border/60 p-0">
            {filtered.map((m) => {
              const open = openId === m.id;
              return (
                <div key={m.id}>
                  <button type="button" onClick={() => setOpenId(open ? null : m.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/20">
                    <div className={cn("size-2 shrink-0 rounded-full", m.unread ? "bg-act-red" : "bg-transparent")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("truncate text-sm", m.unread ? "font-semibold text-foreground" : "text-foreground")}>{m.fromName}</span>
                        {m.flagged ? <Flag className="size-3 shrink-0 fill-amber-500 text-amber-500" /> : null}
                        {m.campaignTitle ? <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">{m.campaignTitle}</Badge> : null}
                      </div>
                      <p className="truncate text-sm text-muted-foreground"><span className="text-foreground">{m.subject}</span> — {m.preview}</p>
                    </div>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{dt(m.receivedAt)}</span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                  </button>
                  {open ? (
                    <div className="border-t border-border/60 bg-muted/10 px-4 py-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">From <span className="text-foreground">{m.fromEmail || m.fromName}</span> · {dt(m.receivedAt)}</p>
                        <div className="flex gap-1.5">
                          <Button type="button" size="sm" variant="outline" onClick={() => { if (m.fromEmail) window.location.href = `mailto:${m.fromEmail}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`; }} disabled={!m.fromEmail}><Reply className="mr-1.5 size-3.5" /> Reply</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => void act(m, "hide")}><EyeOff className="mr-1.5 size-3.5" /> Hide</Button>
                          <Button type="button" size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => void act(m, "delete")}><Trash2 className="mr-1.5 size-3.5" /> Delete</Button>
                        </div>
                      </div>
                      <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-sm text-foreground">{m.body || m.preview || "(No content)"}</pre>
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
