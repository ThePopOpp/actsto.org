"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  LayoutGrid,
  List as ListIcon,
  Mail,
  Pencil,
  Plus,
  Send,
  Table as TableIcon,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Post = {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt?: string | null;
  content?: string | null;
  featuredImageUrl?: string | null;
  categories?: string | null;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  updatedAt: string;
  createdAt: string;
};

type ViewMode = "list" | "table" | "card" | "calendar";

const STATUS_LABEL: Record<string, string> = {
  publish: "Published",
  draft: "Draft",
  future: "Scheduled",
  private: "Private",
  pending: "Pending",
  archived: "Archived",
};

function statusVariant(status: string): "secondary" | "outline" | "destructive" {
  if (status === "publish") return "secondary";
  if (status === "archived") return "destructive";
  return "outline";
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function postDate(p: Post): Date {
  return new Date(p.scheduledAt || p.publishedAt || p.createdAt);
}

export function BlogPostsManager({ onNewPost }: { onNewPost: () => void }) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [emailCount, setEmailCount] = useState(0);
  const [view, setView] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<Post | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Post | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [month, setMonth] = useState<{ y: number; m: number } | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/blog-posts", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { posts?: Post[]; emailTemplateCount?: number } | null;
    if (res.ok) {
      setPosts(data?.posts ?? []);
      setEmailCount(data?.emailTemplateCount ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const stats = useMemo(() => {
    const by = (s: string) => posts.filter((p) => p.status === s).length;
    return { published: by("publish"), drafts: by("draft"), scheduled: by("future"), email: emailCount };
  }, [posts, emailCount]);

  async function setStatus(p: Post, status: string, scheduledAt?: string) {
    await fetch(`/api/admin/blog-posts/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusOnly: true, status, scheduledAt: scheduledAt ?? null }),
    });
    await load();
  }

  async function convertEmail(p: Post) {
    const res = await fetch("/api/admin/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceBlogPostId: p.id }),
    });
    if (res.ok) {
      setNotice(`Email template created from "${p.title}".`);
      await load();
    }
  }

  async function remove(p: Post) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/blog-posts/${p.id}`, { method: "DELETE" });
    await load();
  }

  function openSchedule(p: Post) {
    setScheduleFor(p);
    setScheduleAt(p.scheduledAt?.slice(0, 16) ?? "");
  }

  const actions = (p: Post) => (
    <div className="flex flex-wrap items-center gap-0.5">
      <IconAction label="Preview" onClick={() => setPreview(p)}><Eye className="size-4" /></IconAction>
      <IconAction label="Open public URL" onClick={() => window.open(`/blog/${p.slug}`, "_blank")}>
        <ExternalLink className="size-4" />
      </IconAction>
      <IconAction label="Edit" onClick={() => router.push(`/dashboard/admin/blog-post/${p.id}`)}>
        <Pencil className="size-4" />
      </IconAction>
      <IconAction label="Schedule" onClick={() => openSchedule(p)}><CalendarClock className="size-4" /></IconAction>
      <IconAction label="Convert to email" onClick={() => void convertEmail(p)}><Mail className="size-4" /></IconAction>
      <IconAction
        label={p.status === "archived" ? "Unarchive (draft)" : "Archive"}
        onClick={() => void setStatus(p, p.status === "archived" ? "draft" : "archived")}
      >
        <Archive className="size-4" />
      </IconAction>
      <IconAction label="Delete" destructive onClick={() => void remove(p)}><Trash2 className="size-4" /></IconAction>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Published" value={stats.published} sub="Live on Resources" Icon={FileText} />
        <StatCard label="Drafts" value={stats.drafts} sub="Needs review" Icon={FileText} />
        <StatCard label="Scheduled" value={stats.scheduled} sub="Future publish dates" Icon={CalendarClock} />
        <StatCard label="Email-ready" value={stats.email} sub="Linked templates" Icon={Send} />
      </div>

      {notice ? (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
          {([
            { id: "list", Icon: ListIcon, label: "List" },
            { id: "table", Icon: TableIcon, label: "Table" },
            { id: "card", Icon: LayoutGrid, label: "Cards" },
            { id: "calendar", Icon: CalendarDays, label: "Calendar" },
          ] as const).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === v.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <v.Icon className="size-4" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
        <Button type="button" onClick={onNewPost}>
          <Plus className="mr-1.5 size-4" /> New post
        </Button>
      </div>

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No blog posts yet. Click <strong>New post</strong> to create one.
        </p>
      ) : view === "list" ? (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{p.title}</p>
                <p className="truncate text-xs text-muted-foreground">/{p.slug} · {fmtDate(postDate(p).toISOString())}</p>
              </div>
              <Badge variant={statusVariant(p.status)}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
              {actions(p)}
            </div>
          ))}
        </div>
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Title</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground">{p.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">/{p.slug}</p>
                  </td>
                  <td className="px-3 py-2"><Badge variant={statusVariant(p.status)}>{STATUS_LABEL[p.status] ?? p.status}</Badge></td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtDate(postDate(p).toISOString())}</td>
                  <td className="px-3 py-2">{actions(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "card" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Card key={p.id} className="overflow-hidden border-border/80">
              {p.featuredImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.featuredImageUrl} alt="" className="h-32 w-full object-cover" />
              ) : (
                <div className="h-32 w-full bg-muted" />
              )}
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={statusVariant(p.status)}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                  <span className="text-xs text-muted-foreground">{fmtDate(postDate(p).toISOString())}</span>
                </div>
                <p className="line-clamp-2 font-medium text-foreground">{p.title}</p>
                {p.excerpt ? <p className="line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</p> : null}
                {actions(p)}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <CalendarView posts={posts} month={month} setMonth={setMonth} onSelect={setPreview} />
      )}

      {/* Preview modal */}
      <Dialog open={Boolean(preview)} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-heading text-primary">{preview?.title}</DialogTitle>
            <DialogDescription>
              /{preview?.slug} · {preview ? (STATUS_LABEL[preview.status] ?? preview.status) : ""}
            </DialogDescription>
          </DialogHeader>
          {preview?.content ? (
            <iframe
              title="Post preview"
              srcDoc={`<div style="max-width:680px;margin:0 auto;padding:16px;font-family:Arial,sans-serif;">${preview.content}</div>`}
              className="h-[60vh] w-full rounded-lg border border-border bg-white"
            />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">This post has no content yet.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => window.open(`/blog/${preview?.slug}`, "_blank")}>
              <ExternalLink className="mr-2 size-4" /> Open public page
            </Button>
            <Button type="button" onClick={() => preview && router.push(`/dashboard/admin/blog-post/${preview.id}`)}>
              <Pencil className="mr-2 size-4" /> Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule modal */}
      <Dialog open={Boolean(scheduleFor)} onOpenChange={(o) => !o && setScheduleFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-primary">Schedule post</DialogTitle>
            <DialogDescription>Set a future publish date. The post goes live automatically at that time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="sched">Publish at</Label>
            <Input id="sched" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setScheduleFor(null)}>Cancel</Button>
              <Button
                type="button"
                disabled={!scheduleAt}
                onClick={async () => {
                  if (scheduleFor && scheduleAt) {
                    await setStatus(scheduleFor, "future", scheduleAt);
                    setScheduleFor(null);
                  }
                }}
              >
                Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  Icon,
}: {
  label: string;
  value: number;
  sub: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border/80">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-heading text-3xl font-semibold text-primary">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function IconAction({
  children,
  onClick,
  label,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

function CalendarView({
  posts,
  month,
  setMonth,
  onSelect,
}: {
  posts: Post[];
  month: { y: number; m: number } | null;
  setMonth: (m: { y: number; m: number }) => void;
  onSelect: (p: Post) => void;
}) {
  // Initialise to the most recent post's month, or "now" via the newest post.
  const base = month ?? (() => {
    const d = posts.length ? postDate(posts[0]) : new Date(2026, 6, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  })();

  const first = new Date(base.y, base.m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(base.y, base.m + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(first);

  const byDay = new Map<number, Post[]>();
  for (const p of posts) {
    const d = postDate(p);
    if (d.getFullYear() === base.y && d.getMonth() === base.m) {
      const day = d.getDate();
      byDay.set(day, [...(byDay.get(day) ?? []), p]);
    }
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  return (
    <div className="rounded-lg border border-border/80 p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth({ y: base.m === 0 ? base.y - 1 : base.y, m: base.m === 0 ? 11 : base.m - 1 })}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="font-heading text-sm font-semibold text-primary">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setMonth({ y: base.m === 11 ? base.y + 1 : base.y, m: base.m === 11 ? 0 : base.m + 1 })}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div
            key={i}
            className={cn(
              "min-h-[72px] rounded-md border p-1 text-left",
              day ? "border-border/60 bg-background" : "border-transparent",
            )}
          >
            {day ? (
              <>
                <span className="text-xs text-muted-foreground">{day}</span>
                <div className="mt-0.5 space-y-0.5">
                  {(byDay.get(day) ?? []).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelect(p)}
                      className={cn(
                        "block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium",
                        p.status === "publish"
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                          : p.status === "future"
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                            : "bg-muted text-foreground",
                      )}
                      title={p.title}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
