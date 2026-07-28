"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Columns3, Download,
  FileText, List, Mail, MessageSquare, Phone, ReceiptText, Search, Star, Table as TableIcon, Trophy, X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DonorRow = {
  id: string; createdAt: string; donorName: string; donorEmail: string | null; donorPhone: string | null;
  anonymous: boolean; message: string | null; campaignId: string | null; campaignTitle: string;
  campaignSlug: string | null; status: string; donationType: string; amount: number;
  orderId: string | null; receiptNumber: string | null; taxYear: number | null; userId: string | null;
};
type LeaderRow = { key: string; donorName: string; email: string | null; phone: string | null; userId: string | null; total: number; count: number; firstAt: string; lastAt: string };
type Stats = { total: number; paidSum: number; paidCount: number; pending: number; avgGift: number };
type Trend = { date: string; amount: number };
type ViewMode = "list" | "table" | "kanban" | "calendar" | "leaderboard";
type Preset = { name: string; q: string; status: string; campaignId: string; from: string; to: string; missingReceipt: boolean };
const NONE = "__none__";
const PRESET_KEY = "actsto.donorPresets";

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
function dShort(v: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(v)); }

function StatusBadge({ status }: { status: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${statusColor(status)}1a`, color: statusColor(status) }}><span className="size-1.5 rounded-full" style={{ background: statusColor(status) }} />{statusLabel(status)}</span>;
}

function Sparkline({ data }: { data: Trend[] }) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data.map((d) => d.amount));
  const w = 120, h = 32;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.amount / max) * h}`).join(" ");
  const total = data.reduce((a, d) => a + d.amount, 0);
  return (
    <Card className="border-border/80"><CardContent className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Last 30 days</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="font-heading text-2xl font-semibold text-primary">{money(total)}</p>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-primary"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" /></svg>
      </div>
    </CardContent></Card>
  );
}

export function DonorsWorkspace() {
  const router = useRouter();
  const [rows, setRows] = useState<DonorRow[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [trend, setTrend] = useState<Trend[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("list");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [missingReceipt, setMissingReceipt] = useState(false);
  const [sortField, setSortField] = useState<"createdAt" | "amount">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DonorRow | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [presets, setPresets] = useState<Preset[]>([]);

  const pageSize = view === "list" || view === "table" ? 25 : 500;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setPresets(JSON.parse(localStorage.getItem(PRESET_KEY) || "[]")); } catch { /* ignore */ }
  }, []);

  const commonParams = useCallback(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (missingReceipt) p.set("missingReceipt", "1");
    else if (status) p.set("status", status);
    if (campaignId) p.set("campaignId", campaignId);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p;
  }, [q, status, campaignId, from, to, missingReceipt]);

  const load = useCallback(async () => {
    setLoading(true);
    const p = commonParams();
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    p.set("sortField", sortField);
    p.set("sortDir", sortDir);
    const res = await fetch(`/api/admin/donors?${p}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { rows?: DonorRow[]; total?: number; stats?: Stats; trend?: Trend[]; campaigns?: { id: string; title: string }[] } | null;
    if (res.ok && data) {
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setStats(data.stats ?? null);
      setTrend(data.trend ?? []);
      if (data.campaigns) setCampaigns(data.campaigns);
    }
    if (view === "leaderboard") {
      const lres = await fetch(`/api/admin/donors/leaderboard?${commonParams()}`, { cache: "no-store" });
      const ldata = (await lres.json().catch(() => null)) as { donors?: LeaderRow[] } | null;
      if (lres.ok && ldata) setLeaders(ldata.donors ?? []);
    }
    setLoading(false);
  }, [commonParams, page, pageSize, sortField, sortDir, view]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  function resetPage() { setPage(1); setChecked(new Set()); }
  function toggleSort(field: "createdAt" | "amount") {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }
  function toggleCheck(id: string) {
    setChecked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleCheckAll() {
    setChecked((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function exportCsv() { window.open(`/api/admin/donors/export?${commonParams()}`, "_blank"); }

  function call(r: { donorPhone?: string | null; phone?: string | null }) { const ph = r.donorPhone ?? r.phone; if (ph) router.push(`/dashboard/admin/dialer?to=${encodeURIComponent(ph)}`); }
  function sms(r: { donorPhone?: string | null; phone?: string | null }) { const ph = r.donorPhone ?? r.phone; if (ph) router.push(`/dashboard/admin/sms?tab=send&to=${encodeURIComponent(ph)}`); }
  function email(r: { donorEmail?: string | null; email?: string | null }) { const em = r.donorEmail ?? r.email; if (em) window.location.href = `mailto:${em}`; }

  async function bulkReceipts() {
    setBulkBusy(true);
    await fetch("/api/admin/donors/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(checked), action: "generate_receipts" }) });
    setBulkBusy(false);
    setChecked(new Set());
    await load();
  }
  function bulkEmail() {
    const emails = Array.from(new Set(rows.filter((r) => checked.has(r.id) && r.donorEmail).map((r) => r.donorEmail))).join(",");
    if (emails) router.push(`/dashboard/admin/email?tab=send&to=${encodeURIComponent(emails)}`);
  }
  function bulkSms() {
    const phones = Array.from(new Set(rows.filter((r) => checked.has(r.id) && r.donorPhone).map((r) => r.donorPhone))).join(",");
    if (phones) router.push(`/dashboard/admin/sms?tab=send&to=${encodeURIComponent(phones)}`);
  }

  async function markStatus(id: string, next: string) {
    await fetch(`/api/admin/donors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    setSelected(null);
    await load();
  }
  async function genReceipt(id: string) {
    await fetch(`/api/admin/donors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generateReceipt: true }) });
    setSelected(null);
    await load();
  }

  function savePreset() {
    const name = window.prompt("Name this saved view:");
    if (!name) return;
    const preset: Preset = { name, q, status, campaignId, from, to, missingReceipt };
    const next = [...presets.filter((p) => p.name !== name), preset];
    setPresets(next);
    try { localStorage.setItem(PRESET_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }
  function applyPreset(name: string) {
    const p = presets.find((x) => x.name === name);
    if (!p) return;
    setQ(p.q); setStatus(p.status); setCampaignId(p.campaignId); setFrom(p.from); setTo(p.to); setMissingReceipt(p.missingReceipt);
    resetPage();
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const statCards = useMemo(() => stats ? [
    { label: "Records", value: String(stats.total) },
    { label: "Paid support", value: money(stats.paidSum) },
    { label: "Paid", value: String(stats.paidCount) },
    { label: "Pending", value: String(stats.pending) },
    { label: "Avg gift", value: money(stats.avgGift) },
  ] : [], [stats]);

  const showSelection = view === "list" || view === "table";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/80"><CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold text-primary">{s.value}</p>
          </CardContent></Card>
        ))}
        <Sparkline data={trend} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} placeholder="Search donor, email, order id…" className="pl-8" />
        </div>
        <Select value={status || NONE} onValueChange={(v) => { setStatus(v === NONE ? "" : (v ?? "")); setMissingReceipt(false); resetPage(); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value={NONE}>All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={campaignId || NONE} onValueChange={(v) => { setCampaignId(v === NONE ? "" : (v ?? "")); resetPage(); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Campaign" /></SelectTrigger>
          <SelectContent><SelectItem value={NONE}>All campaigns</SelectItem>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
        </Select>
        <div className="w-36"><DatePicker value={from} onChange={(v) => { setFrom(v); resetPage(); }} placeholder="From date" className="mt-0 h-9" /></div>
        <div className="w-36"><DatePicker value={to} onChange={(v) => { setTo(v); resetPage(); }} placeholder="To date" className="mt-0 h-9" /></div>
        <button type="button" onClick={() => { setMissingReceipt((v) => !v); resetPage(); }} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", missingReceipt ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-border text-muted-foreground hover:bg-muted")}><ReceiptText className="size-3.5" /> Missing receipt</button>
        {presets.length ? (
          <Select value={NONE} onValueChange={(v) => { if (v && v !== NONE) applyPreset(v); }}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Presets" /></SelectTrigger>
            <SelectContent><SelectItem value={NONE}>Presets…</SelectItem>{presets.map((p) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={savePreset}><Star className="mr-1.5 size-4" /> Save view</Button>
        <div className="flex rounded-lg border border-border p-0.5">
          {([["list", List], ["table", TableIcon], ["kanban", Columns3], ["calendar", CalendarIcon], ["leaderboard", Trophy]] as const).map(([v, Icon]) => (
            <button key={v} type="button" onClick={() => { setView(v); resetPage(); }} className={cn("rounded-md p-1.5", view === v ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")} aria-label={v}><Icon className="size-4" /></button>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1.5 size-4" /> CSV</Button>
      </div>

      {/* Bulk bar */}
      {showSelection && checked.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium text-primary">{checked.size} selected</span>
          <Button type="button" size="sm" variant="outline" onClick={bulkEmail}><Mail className="mr-1.5 size-3.5" /> Email</Button>
          <Button type="button" size="sm" variant="outline" onClick={bulkSms}><MessageSquare className="mr-1.5 size-3.5" /> SMS</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void bulkReceipts()} disabled={bulkBusy}><ReceiptText className="mr-1.5 size-3.5" /> Generate receipts</Button>
          <button type="button" onClick={() => setChecked(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      ) : null}

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : view === "leaderboard" ? (
        <Leaderboard leaders={leaders} onCall={call} onSms={sms} onEmail={email} />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No donations match these filters.</p>
      ) : view === "kanban" ? (
        <Kanban rows={rows} onOpen={setSelected} />
      ) : view === "calendar" ? (
        <CalendarView rows={rows} month={calMonth} setMonth={setCalMonth} onOpen={setSelected} />
      ) : view === "table" ? (
        <TableView rows={rows} onOpen={setSelected} checked={checked} onCheck={toggleCheck} onCheckAll={toggleCheckAll} sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
      ) : (
        <ListView rows={rows} onOpen={setSelected} onCall={call} onSms={sms} onEmail={email} checked={checked} onCheck={toggleCheck} />
      )}

      {(view === "list" || view === "table") && pageCount > 1 ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {page} of {pageCount} · {total} records</span>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      ) : null}

      {selected ? <DonorModal row={selected} onClose={() => setSelected(null)} onCall={call} onSms={sms} onEmail={email} onMark={markStatus} onGenReceipt={genReceipt} /> : null}
    </div>
  );
}

function Check({ on, onChange }: { on: boolean; onChange: () => void }) {
  return <input type="checkbox" checked={on} onChange={onChange} onClick={(e) => e.stopPropagation()} className="size-4 shrink-0 rounded border-border" />;
}

function ListView({ rows, onOpen, onCall, onSms, onEmail, checked, onCheck }: { rows: DonorRow[]; onOpen: (r: DonorRow) => void; onCall: (r: DonorRow) => void; onSms: (r: DonorRow) => void; onEmail: (r: DonorRow) => void; checked: Set<string>; onCheck: (id: string) => void }) {
  return (
    <Card className="border-border/80"><CardContent className="divide-y divide-border/60 p-0">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
          <Check on={checked.has(r.id)} onChange={() => onCheck(r.id)} />
          <button type="button" onClick={() => onOpen(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="truncate font-medium text-foreground">{r.donorName}</span><StatusBadge status={r.status} />{!r.receiptNumber && r.status === "paid" ? <span className="text-[10px] text-amber-600">no receipt</span> : null}</div>
              <p className="truncate text-xs text-muted-foreground">{r.campaignTitle} · {dt(r.createdAt)}</p>
            </div>
            <span className="shrink-0 font-medium tabular-nums text-foreground">{money(r.amount)}</span>
          </button>
          <div className="hidden items-center gap-0.5 sm:flex">
            <button type="button" onClick={() => onCall(r)} disabled={!r.donorPhone} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="Call"><Phone className="size-4" /></button>
            <button type="button" onClick={() => onSms(r)} disabled={!r.donorPhone} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="SMS"><MessageSquare className="size-4" /></button>
            <button type="button" onClick={() => onEmail(r)} disabled={!r.donorEmail} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="Email"><Mail className="size-4" /></button>
          </div>
        </div>
      ))}
    </CardContent></Card>
  );
}

function SortHead({ label, active, dir, onClick, className }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; className?: string }) {
  return (
    <th className={cn("px-4 py-2 font-medium", className)}>
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">{label}{active ? (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : null}</button>
    </th>
  );
}

function TableView({ rows, onOpen, checked, onCheck, onCheckAll, sortField, sortDir, onSort }: { rows: DonorRow[]; onOpen: (r: DonorRow) => void; checked: Set<string>; onCheck: (id: string) => void; onCheckAll: () => void; sortField: string; sortDir: "asc" | "desc"; onSort: (f: "createdAt" | "amount") => void }) {
  return (
    <Card className="border-border/80"><CardContent className="overflow-x-auto p-0">
      <table className="w-full min-w-[860px] text-sm">
        <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
          <th className="px-4 py-2"><Check on={checked.size === rows.length && rows.length > 0} onChange={onCheckAll} /></th>
          <SortHead label="Date" active={sortField === "createdAt"} dir={sortDir} onClick={() => onSort("createdAt")} />
          <th className="px-4 py-2 font-medium">Donor</th>
          <th className="px-4 py-2 font-medium">Campaign</th>
          <th className="px-4 py-2 font-medium">Status</th>
          <th className="px-4 py-2 font-medium">Receipt</th>
          <SortHead label="Amount" active={sortField === "amount"} dir={sortDir} onClick={() => onSort("amount")} className="text-right" />
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
              <td className="px-4 py-2"><Check on={checked.has(r.id)} onChange={() => onCheck(r.id)} /></td>
              <td className="cursor-pointer px-4 py-2 tabular-nums text-muted-foreground" onClick={() => onOpen(r)}>{dt(r.createdAt)}</td>
              <td className="cursor-pointer px-4 py-2 font-medium text-foreground" onClick={() => onOpen(r)}>{r.donorName}</td>
              <td className="cursor-pointer px-4 py-2 text-muted-foreground" onClick={() => onOpen(r)}>{r.campaignTitle}</td>
              <td className="cursor-pointer px-4 py-2" onClick={() => onOpen(r)}><StatusBadge status={r.status} /></td>
              <td className="px-4 py-2 font-mono text-xs">{r.receiptNumber ?? "-"}</td>
              <td className="cursor-pointer px-4 py-2 text-right font-medium tabular-nums" onClick={() => onOpen(r)}>{money(r.amount)}</td>
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
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.campaignTitle}</p>
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
    if (d.getFullYear() === month.y && d.getMonth() === month.m) byDay.set(d.getDate(), [...(byDay.get(d.getDate()) ?? []), r]);
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
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const items = day ? byDay.get(day) ?? [] : [];
          const sum = items.reduce((a, r) => a + r.amount, 0);
          return (
            <div key={i} className={cn("min-h-[64px] rounded-lg border p-1.5", day ? "border-border/60" : "border-transparent")}>
              {day ? (<>
                <p className="text-[11px] text-muted-foreground">{day}</p>
                {items.length ? <button type="button" onClick={() => onOpen(items[0])} className="mt-1 w-full rounded bg-primary/10 px-1 py-0.5 text-left"><p className="text-[11px] font-semibold text-primary">{money(sum)}</p><p className="text-[10px] text-muted-foreground">{items.length} gift{items.length === 1 ? "" : "s"}</p></button> : null}
              </>) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Donations loaded for the current filters.</p>
    </CardContent></Card>
  );
}

function Leaderboard({ leaders, onCall, onSms, onEmail }: { leaders: LeaderRow[]; onCall: (r: LeaderRow) => void; onSms: (r: LeaderRow) => void; onEmail: (r: LeaderRow) => void }) {
  if (leaders.length === 0) return <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No paid donors match these filters.</p>;
  return (
    <Card className="border-border/80"><CardContent className="divide-y divide-border/60 p-0">
      {leaders.map((d, i) => (
        <div key={d.key} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
          <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-foreground">{d.donorName}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", d.count > 1 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>{d.count > 1 ? "Repeat" : "First-time"}</span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{d.count} gift{d.count === 1 ? "" : "s"} · first {dShort(d.firstAt)} · last {dShort(d.lastAt)}</p>
          </div>
          <div className="hidden items-center gap-0.5 sm:flex">
            <button type="button" onClick={() => onCall(d)} disabled={!d.phone} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="Call"><Phone className="size-4" /></button>
            <button type="button" onClick={() => onSms(d)} disabled={!d.phone} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="SMS"><MessageSquare className="size-4" /></button>
            <button type="button" onClick={() => onEmail(d)} disabled={!d.email} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="Email"><Mail className="size-4" /></button>
            <a href={`/api/admin/donors/statement?${d.userId ? `userId=${encodeURIComponent(d.userId)}` : `email=${encodeURIComponent(d.email ?? "")}`}&name=${encodeURIComponent(d.donorName)}`} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-muted-foreground hover:bg-muted" title="Statement PDF"><FileText className="size-4" /></a>
          </div>
          <span className="shrink-0 font-heading text-lg font-semibold tabular-nums text-primary">{money(d.total)}</span>
        </div>
      ))}
    </CardContent></Card>
  );
}

function DonorModal({ row, onClose, onCall, onSms, onEmail, onMark, onGenReceipt }: { row: DonorRow; onClose: () => void; onCall: (r: DonorRow) => void; onSms: (r: DonorRow) => void; onEmail: (r: DonorRow) => void; onMark: (id: string, s: string) => void; onGenReceipt: (id: string) => void }) {
  const crmHref = row.donorEmail ? `/dashboard/admin/contacts?q=${encodeURIComponent(row.donorEmail)}` : null;
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
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
            {row.status === "paid" && !row.receiptNumber ? <Button type="button" size="sm" variant="outline" onClick={() => onGenReceipt(row.id)}><ReceiptText className="mr-1.5 size-3.5" /> Generate receipt</Button> : null}
            {row.status !== "refunded" ? <Button type="button" size="sm" variant="outline" className="text-amber-600" onClick={() => onMark(row.id, "refunded")}>Mark refunded</Button> : <Button type="button" size="sm" variant="outline" onClick={() => onMark(row.id, "paid")}>Mark paid</Button>}
            {crmHref ? <Link href={crmHref} className="ml-auto inline-flex items-center text-sm font-medium text-primary hover:underline">CRM profile →</Link> : null}
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
