"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Phone, Trash2 } from "lucide-react";

import type { BusinessCardLead, LeadStatus } from "@/lib/business-cards/types";
import { cn } from "@/lib/utils";

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "archived"];

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export function LeadsInbox({ scope }: { scope: "mine" | "all" }) {
  const [leads, setLeads] = useState<BusinessCardLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | LeadStatus>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/business-cards/leads?scope=${scope}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { leads?: BusinessCardLead[] } | null;
    if (res.ok && data) setLeads(data.leads ?? []);
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function setStatus(lead: BusinessCardLead, status: LeadStatus) {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    await fetch(`/api/business-cards/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function remove(lead: BusinessCardLead) {
    if (!window.confirm("Delete this lead?")) return;
    await fetch(`/api/business-cards/leads/${lead.id}`, { method: "DELETE" });
    await load();
  }

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});
  const filtered = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <FilterPill label={`All ${leads.length}`} active={filter === "all"} onClick={() => setFilter("all")} />
        {STATUSES.map((s) => (
          <FilterPill key={s} label={`${s} ${counts[s] ?? 0}`} active={filter === s} onClick={() => setFilter(s)} />
        ))}
      </div>

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No leads yet. Leads from your public cards&apos; “Send me your info” form land here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Contact</th>
                <th className="px-3 py-2 font-semibold">Message</th>
                <th className="px-3 py-2 font-semibold">Card</th>
                <th className="px-3 py-2 font-semibold">Received</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground">{l.name || "—"}</p>
                    <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                      {l.email ? <p className="inline-flex items-center gap-1"><Mail className="size-3" />{l.email}</p> : null}
                      {l.phone ? <p className="inline-flex items-center gap-1"><Phone className="size-3" />{l.phone}</p> : null}
                    </div>
                  </td>
                  <td className="max-w-[240px] px-3 py-2 text-muted-foreground">
                    <p className="line-clamp-2">{l.message || "—"}</p>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{l.card?.displayName || l.card?.cardName || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{ago(l.createdAt)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={l.status}
                      onChange={(e) => void setStatus(l, e.target.value as LeadStatus)}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs capitalize"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="capitalize">{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void remove(l)}
                      aria-label="Delete lead"
                      className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
