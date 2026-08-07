"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  List as ListIcon,
  Mail,
  Pencil,
  Plus,
  Loader2,
  Send,
  Sparkles,
  Table as TableIcon,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EMAIL_CATEGORY_LABELS, getCatalogEntry, type EmailCategory } from "@/lib/email/catalog";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  title: string;
  subject: string | null;
  preheader: string | null;
  status: string;
  content: string | null;
  updatedAt: string;
  createdAt: string;
  sourceBlogPostId: string | null;
  catalogKey: string | null;
  category: string | null;
  audienceRole: string | null;
};

type ViewMode = "list" | "table" | "cards" | "calendar";

function fmt(v: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(v));
}
function statusBadge(s: string) {
  if (s === "ready") return <Badge className="border-0 bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200">Ready</Badge>;
  if (s === "archived") return <Badge variant="outline">Archived</Badge>;
  return <Badge variant="secondary">Draft</Badge>;
}

export function EmailTemplatesLibrary() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("list");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "ready" | "archived">("all");
  const [preview, setPreview] = useState<Template | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedNote, setSeedNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/email-templates", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { templates?: Template[] } | null;
    if (res.ok && data) setTemplates(data.templates ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(t: Template) {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    await fetch(`/api/admin/email-templates/${t.id}`, { method: "DELETE" });
    await load();
  }
  const edit = (t: Template) => router.push(`/dashboard/admin/email?tab=editor&id=${t.id}`);

  /**
   * Installs any catalogue templates that don't exist yet. Idempotent and
   * non-destructive — it only creates what's missing — so it needs no
   * confirmation step.
   */
  async function installStarterSet() {
    setSeeding(true);
    setSeedNote(null);
    try {
      const res = await fetch("/api/admin/email-templates/seed", { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { created?: number; total?: number; error?: string }
        | null;
      if (!res.ok) {
        setSeedNote(data?.error ?? "Could not install the templates.");
        return;
      }
      setSeedNote(
        data?.created
          ? `Installed ${data.created} template${data.created === 1 ? "" : "s"}.`
          : "Everything in the catalogue is already installed.",
      );
      await load();
    } catch {
      setSeedNote("Network error — nothing was installed.");
    } finally {
      setSeeding(false);
    }
  }
  const use = (t: Template) => router.push(`/dashboard/admin/email?tab=send&template=${t.id}`);

  const filtered = useMemo(
    () => templates.filter((t) => (status === "all" ? true : t.status === status)).filter((t) => (q ? `${t.title} ${t.subject ?? ""}`.toLowerCase().includes(q.toLowerCase()) : true)),
    [templates, status, q],
  );

  const actions = (t: Template) => (
    <div className="flex items-center gap-0.5">
      <IconBtn label="Preview" onClick={() => setPreview(t)}><Eye className="size-4" /></IconBtn>
      <IconBtn label="Edit" onClick={() => edit(t)}><Pencil className="size-4" /></IconBtn>
      <IconBtn label="Use in Send Email" onClick={() => use(t)}><Send className="size-4" /></IconBtn>
      <IconBtn label="Delete" destructive onClick={() => void remove(t)}><Trash2 className="size-4" /></IconBtn>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
          {([
            { id: "list", Icon: ListIcon, label: "List" },
            { id: "table", Icon: TableIcon, label: "Table" },
            { id: "cards", Icon: LayoutGrid, label: "Cards" },
            { id: "calendar", Icon: CalendarDays, label: "Calendar" },
          ] as const).map((v) => (
            <button key={v.id} type="button" onClick={() => setView(v.id)} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", view === v.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              <v.Icon className="size-4" /><span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="h-9 w-52" />
          <Button type="button" variant="outline" onClick={() => void installStarterSet()} disabled={seeding}>
            {seeding ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Sparkles className="mr-1.5 size-4" />}
            Install catalogue
          </Button>
          <Button type="button" onClick={() => router.push("/dashboard/admin/email?tab=editor")}><Plus className="mr-1.5 size-4" /> New template</Button>
        </div>
      </div>

      {seedNote ? (
        <p role="status" className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{seedNote}</p>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {(["all", "ready", "draft", "archived"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors", status === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{s}</button>
        ))}
      </div>

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nothing here yet. <strong>Install catalogue</strong> creates an editable template for every
          email the app can send — welcome messages, campaign alerts, receipts and the rest. You can
          also start one from scratch, or use “Convert to email” on a blog post.
        </p>
      ) : view === "list" ? (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-card p-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Mail className="size-4" /></div>
              <button type="button" onClick={() => setPreview(t)} className="min-w-0 flex-1 text-left">
                <p className="truncate font-medium text-foreground">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">{t.subject || "No subject"} · {fmt(t.updatedAt)}</p>
                <TriggerLine template={t} />
              </button>
              {t.category ? (
                <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                  {EMAIL_CATEGORY_LABELS[t.category as EmailCategory] ?? t.category}
                </Badge>
              ) : null}
              {statusBadge(t.status)}
              {actions(t)}
            </div>
          ))}
        </div>
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr>
              <th className="px-3 py-2 font-semibold">Title</th><th className="px-3 py-2 font-semibold">Subject</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-3 py-2 font-semibold">Updated</th><th className="px-3 py-2 font-semibold">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium text-foreground">{t.title}</td>
                  <td className="max-w-[260px] truncate px-3 py-2 text-muted-foreground">{t.subject || "—"}</td>
                  <td className="px-3 py-2">{statusBadge(t.status)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmt(t.updatedAt)}</td>
                  <td className="px-3 py-2">{actions(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <button type="button" onClick={() => setPreview(t)} className="block h-28 w-full overflow-hidden border-b border-border/60 bg-white">
                {t.content ? <iframe title="" srcDoc={t.content} className="pointer-events-none h-[560px] w-[560px] origin-top-left scale-[0.5]" /> : <div className="grid h-full place-items-center text-muted-foreground"><Mail className="size-6" /></div>}
              </button>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">{statusBadge(t.status)}<span className="text-xs text-muted-foreground">{fmt(t.updatedAt)}</span></div>
                <p className="line-clamp-1 font-medium text-foreground">{t.title}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{t.subject || "No subject"}</p>
                {actions(t)}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <CalendarView templates={filtered} onSelect={setPreview} />
      )}

      {/* Preview modal */}
      <Dialog open={Boolean(preview)} onOpenChange={(o) => !o && setPreview(null)}>
        {/* Wide enough for a 600px email plus its paper margin — anything
            narrower reflows the email and shows a layout nobody will receive. */}
        <DialogContent className="flex h-[92vh] w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12">
            <DialogTitle className="font-heading text-primary">{preview?.title}</DialogTitle>
            <DialogDescription>{preview?.subject || "No subject"}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 bg-muted/30 p-3">
            {preview ? (
              <iframe
                title="Template preview"
                // Rendered server-side through the branded shell, so this is the
                // email as it sends rather than the bare body blocks.
                src={`/api/admin/email-templates/${preview.id}/preview`}
                className="size-full rounded-lg border border-border bg-white"
              />
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 border-t border-border px-5 py-3">
            <Button type="button" variant="outline" onClick={() => preview && edit(preview)}><Pencil className="mr-2 size-4" /> Edit</Button>
            <Button type="button" onClick={() => preview && use(preview)}><Send className="mr-2 size-4" /> Use in Send Email</Button>
            <Button type="button" variant="ghost" className="ml-auto" onClick={() => preview && window.open(`/api/admin/email-templates/${preview.id}/preview`, "_blank")}>
              Open in a new tab
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconBtn({ children, label, onClick, destructive }: { children: React.ReactNode; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={cn("inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", destructive && "hover:bg-destructive/10 hover:text-destructive")}>{children}</button>
  );
}

function CalendarView({ templates, onSelect }: { templates: Template[]; onSelect: (t: Template) => void }) {
  const base = templates.length ? new Date(templates[0].updatedAt) : new Date();
  const [month, setMonth] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const first = new Date(month.y, month.m, 1);
  const startDay = first.getDay();
  const days = new Date(month.y, month.m + 1, 0).getDate();
  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(first);
  const byDay = new Map<number, Template[]>();
  for (const t of templates) {
    const d = new Date(t.updatedAt);
    if (d.getFullYear() === month.y && d.getMonth() === month.m) byDay.set(d.getDate(), [...(byDay.get(d.getDate()) ?? []), t]);
  }
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(d);
  return (
    <div className="rounded-lg border border-border/80 p-3">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setMonth((m) => ({ y: m.m === 0 ? m.y - 1 : m.y, m: m.m === 0 ? 11 : m.m - 1 }))} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><ChevronLeft className="size-4" /></button>
        <span className="font-heading text-sm font-semibold text-primary">{label} · updated</span>
        <button type="button" onClick={() => setMonth((m) => ({ y: m.m === 11 ? m.y + 1 : m.y, m: m.m === 11 ? 0 : m.m + 1 }))} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><ChevronRight className="size-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className={cn("min-h-[72px] rounded-md border p-1", day ? "border-border/60 bg-background" : "border-transparent")}>
            {day ? (<><span className="text-xs text-muted-foreground">{day}</span><div className="mt-0.5 space-y-0.5">{(byDay.get(day) ?? []).map((t) => (<button key={t.id} type="button" onClick={() => onSelect(t)} className="block w-full truncate rounded bg-primary/10 px-1 py-0.5 text-left text-[11px] font-medium text-primary" title={t.title}>{t.title}</button>))}</div></>) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * What causes this email to send, and whether the recipient can turn it off.
 *
 * Shown because it's the question anyone actually has when they open this list —
 * a subject line tells you what it says, not when it happens.
 */
function TriggerLine({ template }: { template: Template }) {
  const entry = template.catalogKey ? getCatalogEntry(template.catalogKey) : null;
  if (!entry) return null;
  return (
    <p className="truncate text-xs text-muted-foreground">
      <span className="text-foreground/70">{entry.trigger}</span>{" "}
      {entry.preference === null ? (
        <span className="font-medium text-destructive">· required</span>
      ) : (
        <span>· optional</span>
      )}
      {entry.planned ? <span className="italic"> · not wired yet</span> : null}
    </p>
  );
}
