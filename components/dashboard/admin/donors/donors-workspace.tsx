"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Columns3, Download, List,
  Mail, MessageSquare, Phone, Search, Table as TableIcon, X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DonorRow = {
  id: string; createdAt: string; donorName: string; donorEmail: string | null; donorPhone: string | null;
  anonymous: boolean; message: string | null; campaignId: string | null; campaignTitle: string;
  campaignSlug: string | null; status: string; donationType: string; amount: number;
  orderId: string | null; receiptNumber: string | null; taxYear: number | null; userId: string | null;
};
type Stats = { total: number; paidSum: number; paidCount: number; pending: number; avgGift: number };
type ViewMode = "list" | "table" | "kanban" | "calendar";
const NONE = "__none__";

const STATUSES: { id: string; label: string; color: string }[] = [
  { id: "pending", label: "Pending", color: "#0ea5e9" },
  { id: "paid", label: "Paid", color: "#16a34a" },
  { id: "failed", label: "Failed", color: "#dc2626" },
  { id: "cancelled", label: "Cancelled", color: "#9ca3af" },
  { id: "refunded", label: "Refunded", color: "#d97706" },
];
function statusColor(s: string) { return STATUSES.find((x) => x.id === s)?.color ?? "#64748b"; }
function statusLabel(s: string) { return STATUSES.find((x) => x.id === s)?.label ?? s; }

function money(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n); }
function dt(v: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Phoenix" }).format(new Date(v)); }
function dShort(v: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(v)); }

function StatusBadge({ status }: { status: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${statusColor(status)}1a`, color: statusColor(status) }}><span className="size-1.5 rounded-full" style={{ background: statusColor(status) }} />{statusLabel(status)}</span>;
}

export function DonorsWorkspace() {
  const router = useRouter();
  const [rows, setRows] = useState<DonorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("list");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DonorRow | null>(null);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const pageSize = view === "list" || view === "table" ? 25 : 500;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (campaignId) params.set("campaignId", campaignId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const res = await fetch(`/api/admin/donors?${params}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { rows?: DonorRow[]; total?: number; stats?: Stats; campaigns?: { id: string; title: string }[] } | null;
    if (res.ok && data) {
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setStats(data.stats ?? null);
      if (data.campaigns) setCampaigns(data.campaigns);
    }
    setLoading(false);
  }, [q, status, campaignId, from, to, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (campaignId) params.set("campaignId", campaignId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/admin/donors/export?${params}`, "_blank");
  }

  function call(r: DonorRow) { if (r.donorPhone) router.push(`/dashboard/admin/dialer?to=${encodeURIComponent(r.donorPhone)}`); }
  function sms(r: DonorRow) { if (r.donorPhone) router.push(`/dashboard/admin/sms?tab=send&to=${encodeURIComponent(r.donorPhone)}`); }
  function email(r: DonorRow) { if (r.donorEmail) window.location.href = `mailto:${r.donorEmail}`; }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const statCards = useMemo(() => stats ? [
    { label: "Donation records", value: String(stats.total) },
    { label: "Paid support", value: money(stats.paidSum) },
    { label: "Paid donations", value: String(stats.paidCount) },
    { label: "Pending", value: String(stats.pending) },
    { label: "Avg gift", value: money(stats.avgGift) },
  ] : [], [stats]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/80"><CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold text-primary">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search donor, email, order id…" className="pl-8" />
        </div>
        <Select value={status || NONE} onValueChange={(v) => { setStatus(v === NONE ? "" : (v ?? "")); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value={NONE}>All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={campaignId || NONE} onValueChange={(v) => { setCampaignId(v === NONE ? "" : (v ?? "")); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Campaign" /></SelectTrigger>
          <SelectContent><SelectItem value={NONE}>All campaigns</SelectItem>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
        </Select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground" aria-label="From date" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground" aria-label="To date" />
        <div className="flex rounded-lg border border-border p-0.5">
          {([["list", List], ["table", TableIcon], ["kanban", Columns3], ["calendar", CalendarIcon]] as const).map(([v, Icon]) => (
            <button key={v} type="button" onClick={() => { setView(v); setPage(1); }} className={cn("rounded-md p-1.5", view === v ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")} aria-label={v}><Icon className="size-4" /></button>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1.5 size-4" /> Export</Button>
      </div>

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No donations match these filters.</p>
      ) : view === "kanban" ? (
        <Kanban rows={rows} onOpen={setSelected} />
      ) : view === "calendar" ? (
        <CalendarView rows={rows} month={calMonth} setMonth={setCalMonth} onOpen={setSelected} />
      ) : view === "table" ? (
        <TableView rows={rows} onOpen={setSelected} />
      ) : (
        <ListView rows={rows} onOpen={setSelected} onCall={call} onSms={sms} onEmail={email} />
      )}

      {/* Pagination (list/table only) */}
      {(view === "list" || view === "table") && pageCount > 1 ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {page} of {pageCount} · {total} records</span>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      ) : null}

      {selected ? <DonorModal row={selected} onClose={() => setSelected(null)} onCall={call} onSms={sms} onEmail={email} /> : null}
    </div>
  );
}

function ListView({ rows, onOpen, onCall, onSms, onEmail }: { rows: DonorRow[]; onOpen: (r: DonorRow) => void; onCall: (r: DonorRow) => void; onSms: (r: DonorRow) => void; onEmail: (r: DonorRow) => void }) {
  return (
    <Card className="border-border/80"><CardContent className="divide-y divide-border/60 p-0">
      {rows.map((r) => (
        <button key={r.id} type="button" onClick={() => onOpen(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/20">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><span className="truncate font-medium text-foreground">{r.donorName}</span><StatusBadge status={r.status} /></div>
            <p className="truncate text-xs text-muted-foreground">{r.campaignTitle} · {dt(r.createdAt)}</p>
          </div>
          <div className="hidden items-center gap-0.5 sm:flex" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => onCall(r)} disabled={!r.donorPhone} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="Call"><Phone className="size-4" /></button>
            <button type="button" onClick={() => onSms(r)} disabled={!r.donorPhone} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="SMS"><MessageSquare className="size-4" /></button>
            <button type="button" onClick={() => onEmail(r)} disabled={!r.donorEmail} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="Email"><Mail className="size-4" /></button>
          </div>
          <span className="shrink-0 font-medium tabular-nums text-foreground">{money(r.amount)}</span>
        </button>
      ))}
    </CardContent></Card>
  );
}

function TableView({ rows, onOpen }: { rows: DonorRow[]; onOpen: (r: DonorRow) => void }) {
  return (
    <Card className="border-border/80"><CardContent className="overflow-x-auto p-0">
      <table className="w-full min-w-[820px] text-sm">
        <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
          <th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">Donor</th><th className="px-4 py-2 font-medium">Campaign</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Receipt</th><th className="px-4 py-2 text-right font-medium">Amount</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r)} className="cursor-pointer border-b border-border/50 hover:bg-muted/20">
              <td className="px-4 py-2 tabular-nums text-muted-foreground">{dt(r.createdAt)}</td>
              <td className="px-4 py-2 font-medium text-foreground">{r.donorName}</td>
              <td className="px-4 py-2 text-muted-foreground">{r.campaignTitle}</td>
              <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-2 font-mono text-xs">{r.receiptNumber ?? "-"}</td>
              <td className="px-4 py-2 text-right font-medium tabular-nums">{money(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function Kanban({ rows, onOpen }: { rows: DonorRow[]; onOpen: (r: DonorRow) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STATUSES.map((s) => {
        const items = rows.filter((r) => r.status === s.id);
        const sum = items.reduce((a, r) => a + r.amount, 0);
        return (
          <div key={s.id} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><span className="size-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
              <span className="text-xs text-muted-foreground">{items.length} · {money(sum)}</span>
            </div>
            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-2">
              {items.map((r) => (
                <button key={r.id} type="button" onClick={() => onOpen(r)} className="w-full rounded-lg border border-border/80 bg-card p-3 text-left hover:border-primary/40">
                  <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium text-foreground">{r.donorName}</span><span className="shrink-0 text-sm font-semibold tabular-nums">{money(r.amount)}</span></div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.campaignTitle} · {dShort(r.createdAt)}</p>
                </button>
              ))}
              {items.length === 0 ? <p className="px-2 py-4 text-center text-xs text-muted-foreground">None</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({ rows, month, setMonth, onOpen }: { rows: DonorRow[]; month: { y: number; m: number }; setMonth: (m: { y: number; m: number }) => void; onOpen: (r: DonorRow) => void }) {
  const first = new Date(month.y, month.m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const byDay = new Map<number, DonorRow[]>();
  for (const r of rows) {
    const d = new Date(r.createdAt);
    if (d.getFullYear() === month.y && d.getMonth() === month.m) {
      byDay.set(d.getDate(), [...(byDay.get(d.getDate()) ?? []), r]);
    }
  }
  const monthLabel = first.toLocaleString("en-US", { month: "long", year: "numeric" });
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <Card className="border-border/80"><CardContent className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setMonth(month.m === 0 ? { y: month.y - 1, m: 11 } : { y: month.y, m: month.m - 1 })} className="rounded p-1.5 hover:bg-muted"><ChevronLeft className="size-4" /></button>
        <span className="font-heading text-base font-semibold text-primary">{monthLabel}</span>
        <button type="button" onClick={() => setMonth(month.m === 11 ? { y: month.y + 1, m: 0 } : { y: month.y, m: month.m + 1 })} className="rounded p-1.5 hover:bg-muted"><ChevronRight className="size-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const items = day ? byDay.get(day) ?? [] : [];
          const sum = items.reduce((a, r) => a + r.amount, 0);
          return (
            <div key={i} className={cn("min-h-[68px] rounded-lg border p-1.5 text-left", day ? "border-border/60" : "border-transparent")}>
              {day ? (
                <>
                  <p className="text-[11px] text-muted-foreground">{day}</p>
                  {items.length ? (
                    <button type="button" onClick={() => onOpen(items[0])} className="mt-1 w-full rounded bg-primary/10 px-1 py-0.5 text-left">
                      <p className="text-[11px] font-semibold text-primary">{money(sum)}</p>
                      <p className="text-[10px] text-muted-foreground">{items.length} gift{items.length === 1 ? "" : "s"}</p>
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Showing donations loaded for the current filters.</p>
    </CardContent></Card>
  );
}

function DonorModal({ row, onClose, onCall, onSms, onEmail }: { row: DonorRow; onClose: () => void; onCall: (r: DonorRow) => void; onSms: (r: DonorRow) => void; onEmail: (r: DonorRow) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:pt-16" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary">{row.donorName}</h2>
            <div className="mt-1 flex items-center gap-2"><StatusBadge status={row.status} /><span className="text-lg font-semibold tabular-nums text-foreground">{money(row.amount)}</span></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="size-5 text-muted-foreground" /></button>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => onCall(row)} disabled={!row.donorPhone}><Phone className="mr-1.5 size-4" /> Call</Button>
            <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => onSms(row)} disabled={!row.donorPhone}><MessageSquare className="mr-1.5 size-4" /> SMS</Button>
            <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => onEmail(row)} disabled={!row.donorEmail}><Mail className="mr-1.5 size-4" /> Email</Button>
          </div>
          <dl className="space-y-2 text-sm">
            <Row label="Email" value={row.donorEmail} />
            <Row label="Phone" value={row.donorPhone} />
            <Row label="Campaign" value={row.campaignSlug ? <Link href={`/campaigns/${row.campaignSlug}`} className="text-primary hover:underline">{row.campaignTitle}</Link> : row.campaignTitle} />
            <Row label="Type" value={row.donationType} />
            <Row label="Tax year" value={row.taxYear ? String(row.taxYear) : null} />
            <Row label="PayPal order" value={row.orderId} mono />
            <Row label="Receipt #" value={row.receiptNumber} mono />
            <Row label="Date" value={dt(row.createdAt)} />
            {row.message ? <div><dt className="text-xs text-muted-foreground">Message</dt><dd className="mt-0.5 whitespace-pre-wrap text-foreground">{row.message}</dd></div> : null}
          </dl>
          <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
            <Link href="/dashboard/admin/receipts" className="text-sm font-medium text-primary hover:underline">View receipts →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (!value) return null;
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className={cn("text-right text-foreground", mono && "font-mono text-xs")}>{value}</dd></div>;
}
