"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Stats = { emailSubs: number; smsSubs: number; optOuts: number; totalEvents: number };
type EventRow = { id: string; channel: string; status: string; contactName: string | null; email: string | null; phone: string | null; source: string; disclosureVersion: string; staffActorEmail: string | null; ipAddress: string | null; createdAt: string };
type ContactRow = { id: string; channel: string; email: string | null; phone: string | null; contactName: string | null; status: string; confirmed: boolean; marketing: boolean; campaignUpdates: boolean; donationUpdates: boolean; updatedAt: string };

function dt(v: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(v));
}
function statusChip(s: string) {
  if (s === "subscribed" || s === "opt_in" || s === "confirmed") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200";
  if (s === "unsubscribed" || s === "opt_out") return "bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200";
  return "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200";
}

export function ConsentManager() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"contacts" | "audit">("contacts");
  // manual action
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (query = "") => {
    setLoading(true);
    const res = await fetch(`/api/admin/consent${query ? `?q=${encodeURIComponent(query)}` : ""}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { stats?: Stats; events?: EventRow[]; contacts?: ContactRow[] } | null;
    if (res.ok && data) { setStats(data.stats ?? null); setEvents(data.events ?? []); setContacts(data.contacts ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function manual(status: "subscribed" | "unsubscribed") {
    if (!contact.trim()) return;
    setBusy(true);
    setNotice(null);
    const body = channel === "email" ? { channel, email: contact, name, status } : { channel, phone: contact, name, status };
    const res = await fetch("/api/admin/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) { setNotice(`Recorded ${status === "subscribed" ? "opt-in" : "opt-out"} for ${contact}.`); setContact(""); setName(""); await load(q); }
    else setNotice("Action failed.");
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Email subscribed" value={stats?.emailSubs ?? 0} />
        <Tile label="SMS subscribed" value={stats?.smsSubs ?? 0} />
        <Tile label="Opt-outs" value={stats?.optOuts ?? 0} />
        <Tile label="Audit events" value={stats?.totalEvents ?? 0} />
      </div>

      {/* Manual staff action */}
      <Card className="border-border/80">
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary"><ShieldCheck className="size-4" /> Record consent on behalf of a contact</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-32"><Label className="text-xs text-muted-foreground">Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as "email" | "sms")}><SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem></SelectContent></Select>
            </div>
            <div className="min-w-[180px] flex-1"><Label className="text-xs text-muted-foreground">{channel === "email" ? "Email" : "Phone"}</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1" /></div>
            <div className="min-w-[140px] flex-1"><Label className="text-xs text-muted-foreground">Name (optional)</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
            <Button type="button" size="sm" onClick={() => void manual("subscribed")} disabled={busy || !contact.trim()}>{busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null} Opt in</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void manual("unsubscribed")} disabled={busy || !contact.trim()}>Opt out</Button>
          </div>
          <p className="text-xs text-muted-foreground">Every action is logged to the audit trail with your admin identity, timestamp, and IP.</p>
          {notice ? <p className="text-sm text-primary">{notice}</p> : null}
        </CardContent>
      </Card>

      {/* Search + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 border-b border-border">
          {(["contacts", "audit"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cn("-mb-px border-b-2 px-1 pb-2 text-sm font-medium capitalize", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{t === "contacts" ? "Current state" : "Audit trail"}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(q); }} placeholder="Search email / phone…" className="h-9 w-56 pl-8" />
        </div>
      </div>

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : tab === "contacts" ? (
        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr>
              <th className="px-3 py-2 font-semibold">Contact</th><th className="px-3 py-2 font-semibold">Channel</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-3 py-2 font-semibold">Categories</th><th className="px-3 py-2 font-semibold">Updated</th>
            </tr></thead>
            <tbody className="divide-y divide-border/60">
              {contacts.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No consent records yet.</td></tr> : contacts.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2"><p className="font-medium text-foreground">{c.contactName ?? "—"}</p><p className="text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</p></td>
                  <td className="px-3 py-2 uppercase text-muted-foreground">{c.channel}</td>
                  <td className="px-3 py-2"><span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize", statusChip(c.status))}>{c.status}</span>{c.channel === "email" && !c.confirmed ? <span className="ml-1 text-[10px] text-amber-600">unconfirmed</span> : null}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.channel === "email" ? [c.marketing && "News", c.campaignUpdates && "Campaigns", c.donationUpdates && "Donations"].filter(Boolean).join(" · ") || "—" : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{dt(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr>
              <th className="px-3 py-2 font-semibold">When</th><th className="px-3 py-2 font-semibold">Channel</th><th className="px-3 py-2 font-semibold">Action</th><th className="px-3 py-2 font-semibold">Contact</th><th className="px-3 py-2 font-semibold">Source</th><th className="px-3 py-2 font-semibold">Disclosure</th><th className="px-3 py-2 font-semibold">Actor / IP</th>
            </tr></thead>
            <tbody className="divide-y divide-border/60">
              {events.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No consent events yet.</td></tr> : events.map((e) => (
                <tr key={e.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2 text-muted-foreground">{dt(e.createdAt)}</td>
                  <td className="px-3 py-2 uppercase text-muted-foreground">{e.channel}</td>
                  <td className="px-3 py-2"><span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", statusChip(e.status))}>{e.status.replace("_", " ")}</span></td>
                  <td className="px-3 py-2 text-muted-foreground">{e.email ?? e.phone ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{e.source}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{e.disclosureVersion}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{e.staffActorEmail ?? e.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm" className="p-3">
      <CardContent className="p-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-heading text-2xl font-semibold text-primary tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
