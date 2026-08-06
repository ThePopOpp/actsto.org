"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
  Mail,
  MapPin,
  MessageSquare,
  Plus,
  Settings2,
  Star,
  Table as TableIcon,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { AdminCampaign } from "@/app/api/admin/campaigns/route";
import { cn, FACE_SAFE_CROP, initialsOf } from "@/lib/utils";

type ViewMode = "card" | "list" | "table" | "kanban" | "calendar" | "map";

const STATUS: Record<string, { label: string; chip: string }> = {
  draft: { label: "Draft", chip: "bg-muted text-muted-foreground" },
  pending_review: { label: "Pending review", chip: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200" },
  active: { label: "Active", chip: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200" },
  paused: { label: "Paused", chip: "bg-slate-100 text-slate-800 dark:bg-slate-400/15 dark:text-slate-200" },
  completed: { label: "Completed", chip: "bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200" },
  rejected: { label: "Rejected", chip: "bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200" },
  archived: { label: "Archived", chip: "bg-neutral-200 text-neutral-700 dark:bg-neutral-500/15 dark:text-neutral-300" },
};
const statusLabel = (s: string) => STATUS[s]?.label ?? s;
const statusChip = (s: string) => STATUS[s]?.chip ?? "bg-muted text-muted-foreground";

const KANBAN_COLUMNS = ["draft", "pending_review", "active", "completed", "archived"] as const;

function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v || 0);
}
function pct(c: AdminCampaign) {
  return c.goalAmount > 0 ? Math.min(100, Math.round((c.raisedAmount / c.goalAmount) * 100)) : 0;
}
function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(v));
}

const VIEWS: { id: ViewMode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "card", label: "Card", Icon: LayoutGrid },
  { id: "list", label: "List", Icon: ListIcon },
  { id: "table", label: "Table", Icon: TableIcon },
  { id: "kanban", label: "Kanban", Icon: Columns3 },
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "map", label: "Map", Icon: MapPin },
];

export function AdminCampaignsManager() {
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("card");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [manageId, setManageId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/campaigns", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { campaigns?: AdminCampaign[] } | null;
    if (res.ok && data) setCampaigns(data.campaigns ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const patch = useCallback(async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/admin/campaigns/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await load();
  }, [load]);

  const remove = useCallback(async (c: AdminCampaign) => {
    if (!window.confirm(`Delete "${c.title}"? This permanently removes the campaign and cannot be undone.`)) return;
    await fetch(`/api/admin/campaigns/${c.id}`, { method: "DELETE" });
    await load();
  }, [load]);

  function toast(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2500);
  }

  const filtered = useMemo(
    () => campaigns.filter((c) => (statusFilter === "all" ? true : statusFilter === "featured" ? c.isFeatured : c.status === statusFilter)),
    [campaigns, statusFilter],
  );
  const managed = campaigns.find((c) => c.id === manageId) ?? null;

  const controls = { patch, remove, toast, onManage: setManageId };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-lg border border-border bg-background p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors", view === v.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
            >
              <v.Icon className="size-4" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
        <Link href="/campaigns/new" target="_blank" className="inline-flex">
          <Button type="button" size="sm"><Plus className="mr-1.5 size-4" /> Create campaign</Button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        {(["all", "featured", "pending_review", "active", "paused", "completed", "rejected", "archived", "draft"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", statusFilter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}
          >
            {f === "all" ? "All" : f === "featured" ? "★ Featured" : statusLabel(f)}
          </button>
        ))}
      </div>

      {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p> : null}

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading campaigns…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No campaigns match this filter.
        </p>
      ) : view === "card" ? (
        <CardView campaigns={filtered} controls={controls} />
      ) : view === "list" ? (
        <ListView campaigns={filtered} controls={controls} />
      ) : view === "table" ? (
        <TableView campaigns={filtered} controls={controls} />
      ) : view === "kanban" ? (
        <KanbanView campaigns={filtered} controls={controls} />
      ) : view === "calendar" ? (
        <CalendarView campaigns={filtered} controls={controls} />
      ) : (
        <MapView campaigns={filtered} controls={controls} />
      )}

      {managed ? (
        <ManageDialog
          campaign={managed}
          onClose={() => setManageId(null)}
          onPatch={async (body) => { await patch(managed.id, body); }}
          onDelete={async () => { await remove(managed); setManageId(null); }}
        />
      ) : null}
    </div>
  );
}

type Controls = {
  patch: (id: string, body: Record<string, unknown>) => Promise<void>;
  remove: (c: AdminCampaign) => Promise<void>;
  toast: (msg: string) => void;
  onManage: (id: string) => void;
};

// Quick inline icon controls (shared across views).
function QuickActions({ c, controls }: { c: AdminCampaign; controls: Controls }) {
  return (
    <div className="flex items-center gap-0.5">
      <IconBtn label={c.isFeatured ? "Unfeature" : "Feature"} active={c.isFeatured} onClick={() => void controls.patch(c.id, { isFeatured: !c.isFeatured })}>
        <Star className={cn("size-4", c.isFeatured && "fill-current")} />
      </IconBtn>
      <IconBtn label="Public page" onClick={() => window.open(`/campaigns/${c.slug}`, "_blank")}>
        <ExternalLink className="size-4" />
      </IconBtn>
      <IconBtn label="Email owner" disabled={!c.ownerEmail} onClick={() => { if (c.ownerEmail) window.location.href = `mailto:${c.ownerEmail}?subject=${encodeURIComponent(`Your campaign: ${c.title}`)}`; }}>
        <Mail className="size-4" />
      </IconBtn>
      <IconBtn label="Manage" onClick={() => controls.onManage(c.id)}>
        <Settings2 className="size-4" />
      </IconBtn>
    </div>
  );
}

function IconBtn({ children, label, onClick, active, disabled }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn("inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40", active && "text-amber-500")}
    >
      {children}
    </button>
  );
}

function Thumb({ c, className }: { c: AdminCampaign; className?: string }) {
  if (c.featuredImageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.featuredImageUrl} alt="" className={cn("object-cover", FACE_SAFE_CROP, className)} />;
  }
  return <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}><LayoutGrid className="size-5" /></div>;
}

/**
 * Round avatar for dense rows: the campaign photo when there is one, otherwise
 * the owner's initials. An empty grey circle tells you nothing; "JW" at least
 * identifies the row at a glance.
 */
function RowAvatar({ c }: { c: AdminCampaign }) {
  const owner = c.ownerName ?? c.ownerEmail ?? "";

  if (c.featuredImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={c.featuredImageUrl}
        alt=""
        className={cn("size-9 shrink-0 rounded-full object-cover", FACE_SAFE_CROP)}
      />
    );
  }

  return (
    <span
      aria-hidden
      title={owner || undefined}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-primary"
    >
      {initialsOf(owner)}
    </span>
  );
}

// ── Card view ────────────────────────────────────────────────────────────────
function CardView({ campaigns, controls }: { campaigns: AdminCampaign[]; controls: Controls }) {
  return (
    // Up to five across on a wide admin screen. Three left each card wider than
    // its own thumbnail needed, which made the grid look sparse.
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {campaigns.map((c) => (
        <Card key={c.id} className="overflow-hidden">
          <div className="relative">
            <Thumb c={c} className="h-32 w-full" />
            {c.isFeatured ? <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">★ Featured</span> : null}
          </div>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <Badge className={cn("border-0", statusChip(c.status))}>{statusLabel(c.status)}</Badge>
              <span className="text-xs text-muted-foreground">{c.city ? `${c.city}, ${c.state ?? ""}` : c.state ?? ""}</span>
            </div>
            <p className="line-clamp-1 font-medium text-foreground">{c.title}</p>
            <div>
              <div className="flex justify-between text-xs tabular-nums text-muted-foreground"><span>{money(c.raisedAmount)}</span><span>{pct(c)}% of {money(c.goalAmount)}</span></div>
              <Progress value={pct(c)} className="mt-1 h-1.5" />
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-2">
              <span className="truncate text-xs text-muted-foreground">{c.ownerName ?? c.ownerEmail ?? "—"}</span>
              <QuickActions c={c} controls={controls} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── List view ────────────────────────────────────────────────────────────────
function ListView({ campaigns, controls }: { campaigns: AdminCampaign[]; controls: Controls }) {
  return (
    <div className="space-y-2">
      {campaigns.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-card p-3">
          <Thumb c={c} className="size-12 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-foreground">{c.title}</p>
              {c.isFeatured ? <Star className="size-3.5 shrink-0 fill-amber-500 text-amber-500" /> : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">{c.ownerName ?? c.ownerEmail ?? "—"} · {c.city ? `${c.city}, ${c.state ?? ""}` : "—"}</p>
          </div>
          <div className="hidden w-40 sm:block">
            <div className="flex justify-between text-xs tabular-nums text-muted-foreground"><span>{pct(c)}%</span><span>{money(c.raisedAmount)}</span></div>
            <Progress value={pct(c)} className="mt-1 h-1.5" />
          </div>
          <Badge className={cn("border-0", statusChip(c.status))}>{statusLabel(c.status)}</Badge>
          <QuickActions c={c} controls={controls} />
        </div>
      ))}
    </div>
  );
}

// ── Table view ───────────────────────────────────────────────────────────────
function TableView({ campaigns, controls }: { campaigns: AdminCampaign[]; controls: Controls }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/80">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">Campaign</th>
            <th className="px-3 py-2 font-semibold">Owner</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 text-right font-semibold">Raised</th>
            <th className="px-3 py-2 text-right font-semibold">Goal</th>
            <th className="px-3 py-2 text-right font-semibold">Donors</th>
            <th className="px-3 py-2 font-semibold">Ends</th>
            <th className="px-3 py-2 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-muted/20">
              <td className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <RowAvatar c={c} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {c.isFeatured ? <Star className="size-3.5 shrink-0 fill-amber-500 text-amber-500" /> : null}
                      <span className="font-medium text-foreground">{c.title}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">/{c.slug}</span>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{c.ownerName ?? c.ownerEmail ?? "—"}</td>
              <td className="px-3 py-2"><Badge className={cn("border-0", statusChip(c.status))}>{statusLabel(c.status)}</Badge></td>
              <td className="px-3 py-2 text-right tabular-nums">{money(c.raisedAmount)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{money(c.goalAmount)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{c.donorCount}</td>
              <td className="px-3 py-2 text-muted-foreground">{fmtDate(c.endsAt)}</td>
              <td className="px-3 py-2"><QuickActions c={c} controls={controls} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Kanban view (drag to change status) ──────────────────────────────────────
function KanbanView({ campaigns, controls }: { campaigns: AdminCampaign[]; controls: Controls }) {
  const [dragId, setDragId] = useState<string | null>(null);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {KANBAN_COLUMNS.map((col) => {
        const items = campaigns.filter((c) => c.status === col);
        return (
          <div
            key={col}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId) void controls.patch(dragId, { status: col }); setDragId(null); }}
            className="flex w-72 shrink-0 flex-col rounded-lg border border-border/70 bg-muted/20"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <span className="text-sm font-semibold text-foreground">{statusLabel(col)}</span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="flex min-h-[80px] flex-1 flex-col gap-2 p-2">
              {items.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  className="rounded-lg border border-border/70 bg-card p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 text-sm font-medium text-foreground">{c.title}</p>
                    {c.isFeatured ? <Star className="size-3.5 shrink-0 fill-amber-500 text-amber-500" /> : null}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground"><span>{pct(c)}%</span><span>{money(c.raisedAmount)}</span></div>
                  <div className="mt-1.5 flex justify-end"><QuickActions c={c} controls={controls} /></div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Calendar view (by end date) ──────────────────────────────────────────────
function CalendarView({ campaigns, controls }: { campaigns: AdminCampaign[]; controls: Controls }) {
  const dated = campaigns.filter((c) => c.endsAt);
  const base = dated.length ? new Date(dated[0].endsAt as string) : new Date();

  const [scale, setScale] = useState<CalendarScale>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date(base));

  const range = calendarRange(anchor, scale);
  const inRange = dated.filter((c) => {
    const d = new Date(c.endsAt as string);
    return d >= range.start && d <= range.end;
  });

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const byDay = new Map<string, AdminCampaign[]>();
  for (const c of inRange) {
    const key = dayKey(new Date(c.endsAt as string));
    byDay.set(key, [...(byDay.get(key) ?? []), c]);
  }

  const entry = (c: AdminCampaign) => (
    <button
      key={c.id}
      type="button"
      onClick={() => controls.onManage(c.id)}
      className={cn(
        "block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium",
        statusChip(c.status),
      )}
      title={c.title}
    >
      {c.title}
    </button>
  );

  return (
    <div className="rounded-lg border border-border/80 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAnchor((d) => shiftCalendar(d, scale, -1))}
            aria-label="Previous"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setAnchor((d) => shiftCalendar(d, scale, 1))}
            aria-label="Next"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <span className="font-heading text-sm font-semibold text-primary">
          {range.label} · campaign deadlines
        </span>

        {/* Day / Week / Month / Year */}
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {CALENDAR_SCALES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScale(s)}
              aria-pressed={scale === s}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                scale === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {scale === "year" ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, m) => {
            const monthDate = new Date(anchor.getFullYear(), m, 1);
            const items = inRange.filter((c) => new Date(c.endsAt as string).getMonth() === m);
            return (
              <div key={m} className="rounded-md border border-border/60 p-2">
                <p className="mb-1 text-xs font-semibold text-foreground">
                  {new Intl.DateTimeFormat("en-US", { month: "long" }).format(monthDate)}
                </p>
                {items.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">—</p>
                ) : (
                  <div className="space-y-0.5">{items.map(entry)}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : scale === "day" ? (
        <div className="rounded-md border border-border/60 p-3">
          {(byDay.get(dayKey(anchor)) ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaign deadlines on this day.</p>
          ) : (
            <div className="space-y-1">{(byDay.get(dayKey(anchor)) ?? []).map(entry)}</div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarCells(anchor, scale).map((cell, i) => (
              <div
                key={i}
                className={cn(
                  "min-h-[76px] rounded-md border p-1",
                  cell ? "border-border/60 bg-background" : "border-transparent",
                )}
              >
                {cell ? (
                  <>
                    <span className="text-xs text-muted-foreground">{cell.getDate()}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {(byDay.get(dayKey(cell)) ?? []).map(entry)}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Calendar helpers ─────────────────────────────────────────────────────────

const CALENDAR_SCALES = ["day", "week", "month", "year"] as const;
type CalendarScale = (typeof CALENDAR_SCALES)[number];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date) {
  const s = startOfDay(d);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

/** Inclusive start/end plus a heading for the current scale. */
function calendarRange(anchor: Date, scale: CalendarScale) {
  const fmt = (opts: Intl.DateTimeFormatOptions, d: Date) =>
    new Intl.DateTimeFormat("en-US", opts).format(d);

  if (scale === "day") {
    const start = startOfDay(anchor);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: fmt({ dateStyle: "full" }, start) };
  }

  if (scale === "week") {
    const start = startOfWeek(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const sameMonth = start.getMonth() === end.getMonth();
    return {
      start,
      end,
      label: sameMonth
        ? `${fmt({ month: "long", day: "numeric" }, start)} – ${fmt({ day: "numeric", year: "numeric" }, end)}`
        : `${fmt({ month: "short", day: "numeric" }, start)} – ${fmt({ month: "short", day: "numeric", year: "numeric" }, end)}`,
    };
  }

  if (scale === "year") {
    const start = new Date(anchor.getFullYear(), 0, 1);
    const end = new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end, label: String(anchor.getFullYear()) };
  }

  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end, label: fmt({ month: "long", year: "numeric" }, start) };
}

function shiftCalendar(anchor: Date, scale: CalendarScale, direction: 1 | -1): Date {
  const d = new Date(anchor);
  if (scale === "day") d.setDate(d.getDate() + direction);
  else if (scale === "week") d.setDate(d.getDate() + 7 * direction);
  else if (scale === "year") d.setFullYear(d.getFullYear() + direction);
  else d.setMonth(d.getMonth() + direction);
  return d;
}

/** Grid cells for the week and month scales; null pads the leading blanks. */
function calendarCells(anchor: Date, scale: CalendarScale): (Date | null)[] {
  if (scale === "week") {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const days = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let d = 1; d <= days; d += 1) {
    cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), d));
  }
  return cells;
}

// ── Map view (free OpenStreetMap) ────────────────────────────────────────────
function MapView({ campaigns, controls }: { campaigns: AdminCampaign[]; controls: Controls }) {
  const located = campaigns.filter((c) => c.city || c.state);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-lg border border-border/80">
        <iframe
          title="Campaign map"
          className="h-[420px] w-full"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-114.9,31.2,-108.9,37.1&layer=mapnik"
        />
        <p className="border-t border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
          Free OpenStreetMap view of Arizona. Pinned markers arrive with the Google Maps integration.
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Locations · {located.length}</p>
        {located.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No campaign has a city or state on it yet, so there is nothing to pin. Add those on a
            campaign — Manage → location — and it will appear here.
          </p>
        ) : (
          located.map((c) => (
            <div key={c.id} className="rounded-lg border border-border/70 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                  <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${c.city ?? ""} ${c.state ?? ""}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <MapPin className="size-3" /> {c.city ? `${c.city}, ${c.state ?? ""}` : c.state}
                  </a>
                </div>
                <QuickActions c={c} controls={controls} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Manage dialog (the "module") ─────────────────────────────────────────────
function ManageDialog({
  campaign,
  onClose,
  onPatch,
  onDelete,
}: {
  campaign: AdminCampaign;
  onClose: () => void;
  onPatch: (body: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [startsAt, setStartsAt] = useState(campaign.startsAt ? campaign.startsAt.slice(0, 10) : "");
  const [endsAt, setEndsAt] = useState(campaign.endsAt ? campaign.endsAt.slice(0, 10) : "");

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    await onPatch(body);
    setBusy(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">{campaign.title}</DialogTitle>
          <DialogDescription>Manage status, visibility, schedule, and moderation.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(["active", "pending_review", "paused", "completed", "rejected", "draft", "archived"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => void run({ status: s })}
                  className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", campaign.status === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}
                >
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick moderation */}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void run({ status: "active" })} disabled={busy}><Check className="mr-1.5 size-4" /> Approve</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void run({ status: "pending_review" })} disabled={busy}><CalendarClock className="mr-1.5 size-4" /> Set pending</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void run({ status: "archived" })} disabled={busy}><Archive className="mr-1.5 size-4" /> Archive</Button>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={campaign.isFeatured} disabled={busy} onChange={(e) => void run({ isFeatured: e.target.checked })} className="size-4" />
              <Star className="size-4 text-amber-500" /> Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={campaign.isPublic} disabled={busy} onChange={(e) => void run({ isPublic: e.target.checked })} className="size-4" />
              Public
            </label>
          </div>

          {/* Schedule */}
          <div className="rounded-lg border border-border/60 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">Starts</Label><DatePicker value={startsAt} onChange={setStartsAt} placeholder="Pick a date" /></div>
              <div><Label className="text-xs text-muted-foreground">Ends</Label><DatePicker value={endsAt} onChange={setEndsAt} placeholder="Pick a date" /></div>
            </div>
            <Button type="button" size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => void run({ startsAt: startsAt || null, endsAt: endsAt || null })}>
              Save schedule
            </Button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
            <Button type="button" size="sm" variant="outline" onClick={() => window.open(`/campaigns/${campaign.slug}`, "_blank")}><ExternalLink className="mr-1.5 size-4" /> Edit / view</Button>
            <Button type="button" size="sm" variant="outline" disabled={!campaign.ownerEmail} onClick={() => { if (campaign.ownerEmail) window.location.href = `mailto:${campaign.ownerEmail}?subject=${encodeURIComponent(`Your campaign: ${campaign.title}`)}`; }}><Mail className="mr-1.5 size-4" /> Email owner</Button>
            <Button type="button" size="sm" variant="outline" disabled title="Direct Messages coming soon"><MessageSquare className="mr-1.5 size-4" /> DM</Button>
            <Button type="button" size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => void onDelete()}><Trash2 className="mr-1.5 size-4" /> Delete</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
