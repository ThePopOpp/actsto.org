"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  BarChart3,
  Copy,
  CreditCard,
  Eye,
  Heart,
  Link2,
  MousePointerClick,
  Pencil,
  Plus,
  QrCode,
  Send,
  Share2,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { makeNewCard } from "@/lib/business-cards/defaults";
import type { BusinessCard, CardStats } from "@/lib/business-cards/types";
import { cn } from "@/lib/utils";

import { CardAnalytics } from "@/components/dashboard/business-cards/card-analytics";
import { CardBuilder } from "@/components/dashboard/business-cards/card-builder";
import { LeadsInbox } from "@/components/dashboard/business-cards/leads-inbox";

const APP_BASE =
  typeof window !== "undefined" ? window.location.origin : "https://actsto.org";

type View = { kind: "list" } | { kind: "builder"; card: BusinessCard } | { kind: "analytics"; card: BusinessCard };

export function BusinessCardsClient({
  owner,
  isAdmin,
}: {
  owner: { displayName: string; email: string };
  isAdmin: boolean;
}) {
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [tab, setTab] = useState<"cards" | "leads">("cards");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [view, setView] = useState<View>({ kind: "list" });
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/business-cards?scope=${scope}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { cards?: BusinessCard[]; stats?: CardStats } | null;
    if (res.ok && data) {
      setCards(data.cards ?? []);
      setStats(data.stats ?? null);
    }
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function quickStatus(card: BusinessCard, status: string) {
    await fetch(`/api/business-cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function remove(card: BusinessCard) {
    if (!window.confirm(`Delete "${card.cardName}"? This cannot be undone.`)) return;
    await fetch(`/api/business-cards/${card.id}`, { method: "DELETE" });
    await load();
  }

  function publicUrl(card: BusinessCard) {
    return `${APP_BASE}/c/${card.slug}`;
  }
  async function copyLink(card: BusinessCard) {
    try {
      await navigator.clipboard.writeText(publicUrl(card));
      setNotice("Public link copied.");
      window.setTimeout(() => setNotice(null), 2000);
    } catch {
      /* ignore */
    }
  }

  if (view.kind === "builder") {
    return (
      <CardBuilder
        initial={view.card}
        isAdmin={isAdmin}
        onBack={() => setView({ kind: "list" })}
        onSaved={async () => {
          await load();
          setView({ kind: "list" });
        }}
      />
    );
  }
  if (view.kind === "analytics") {
    return <CardAnalytics card={view.card} onBack={() => setView({ kind: "list" })} />;
  }

  const filtered = cards.filter((c) =>
    statusFilter === "all" ? true : statusFilter === "published" ? c.status === "published" : c.status === "draft",
  );

  return (
    <div className="space-y-5">
      {/* Scope + create */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isAdmin ? (
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            {(["mine", "all"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Users className="size-4" />
                {s === "mine" ? "My cards" : "All staff"}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}
        <Button type="button" onClick={() => setView({ kind: "builder", card: makeNewCard(owner) })}>
          <Plus className="mr-1.5 size-4" /> Create card
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {(["cards", "leads"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-medium capitalize transition-colors",
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "cards" ? <CreditCard className="size-4" /> : <Send className="size-4" />}
            {t}
            {t === "leads" && stats?.newLeads ? (
              <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {stats.newLeads}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p> : null}

      {tab === "leads" ? (
        <LeadsInbox scope={scope} />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <Stat label="Cards" value={stats?.cards ?? 0} Icon={CreditCard} />
            <Stat label="Published" value={stats?.published ?? 0} Icon={Eye} />
            <Stat label="Views" value={stats?.views ?? 0} Icon={Eye} />
            <Stat label="Clicks" value={stats?.clicks ?? 0} Icon={MousePointerClick} />
            <Stat label="NFC ready" value={stats?.nfcReady ?? 0} Icon={QrCode} />
            <Stat label="Shares" value={stats?.shares ?? 0} Icon={Share2} />
            <Stat label="Saves" value={stats?.saves ?? 0} Icon={Heart} />
            <Stat label="Leads" value={stats?.leads ?? 0} Icon={Send} />
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5">
            {(["all", "published", "draft"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                  statusFilter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No cards yet. Click <strong>Create card</strong> to build your first digital business card.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((card) => (
                <Card key={card.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-foreground">{card.displayName || card.cardName}</p>
                        <StatusBadge status={card.status} />
                      </div>
                      <p className="truncate font-mono text-xs text-muted-foreground">/c/{card.slug}</p>
                      <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{card.viewCount}</span>
                        <span className="inline-flex items-center gap-1"><MousePointerClick className="size-3.5" />{card.clickCount}</span>
                      </p>
                    </div>
                    <div
                      className="grid size-16 shrink-0 place-items-center rounded-lg text-[10px] font-semibold"
                      style={{ background: card.backgroundColor, color: card.accentColor }}
                    >
                      {(card.displayName || card.cardName || "C").slice(0, 1)}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <ActionBtn Icon={Pencil} label="Edit" onClick={() => setView({ kind: "builder", card })} primary />
                    <ActionBtn Icon={BarChart3} label="Analytics" onClick={() => setView({ kind: "analytics", card })} />
                    <ActionBtn Icon={Copy} label="Copy link" onClick={() => void copyLink(card)} />
                    <ActionBtn Icon={Link2} label="Public page" onClick={() => window.open(publicUrl(card), "_blank")} />
                    <ActionBtn
                      Icon={QrCode}
                      label="QR PNG"
                      onClick={() => window.open(`/api/cards/qr?url=${encodeURIComponent(publicUrl(card))}&size=512`, "_blank")}
                    />
                    {card.status === "published" ? (
                      <ActionBtn Icon={Upload} label="Unpublish" onClick={() => void quickStatus(card, "unpublished")} />
                    ) : (
                      <ActionBtn Icon={Upload} label="Publish" onClick={() => void quickStatus(card, "published")} />
                    )}
                    <ActionBtn Icon={Archive} label="Archive" onClick={() => void quickStatus(card, "archived")} />
                    <ActionBtn Icon={Trash2} label="Delete" onClick={() => void remove(card)} destructive />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, Icon }: { label: string; value: number; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card size="sm" className="p-3">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
        <p className="mt-1 font-heading text-2xl font-semibold text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
    draft: "bg-muted text-muted-foreground",
    unpublished: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
    archived: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", map[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

function ActionBtn({
  Icon,
  label,
  onClick,
  primary,
  destructive,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  primary?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
        primary
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : destructive
            ? "border-border text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            : "border-border text-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
