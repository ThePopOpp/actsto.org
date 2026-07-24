"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BusinessCard } from "@/lib/business-cards/types";

type Analytics = {
  card: { id: string; cardName: string; slug: string; viewCount: number; clickCount: number };
  byType: Record<string, number>;
  topLinks: { label: string; clicks: number }[];
  recent: { eventType: string; at: string }[];
};

const EVENT_LABELS: Record<string, string> = {
  view: "Views",
  link_click: "Link clicks",
  qr_scan: "QR scans",
  nfc_tap: "NFC taps",
  share: "Shares",
  copy_link: "Copies",
  save_contact: "Contact saves",
  like: "Likes",
  lead_submit: "Leads",
};

export function CardAnalytics({ card, onBack }: { card: BusinessCard; onBack: () => void }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch(`/api/business-cards/${card.id}/analytics`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { analytics?: Analytics } | null;
      if (active && res.ok && json?.analytics) setData(json.analytics);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [card.id]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 size-4" /> Back
        </Button>
        <div>
          <h2 className="font-heading text-lg font-semibold text-primary">{card.displayName || card.cardName} · Analytics</h2>
          <p className="font-mono text-xs text-muted-foreground">/c/{card.slug}</p>
        </div>
      </div>

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : !data ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No analytics available.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(EVENT_LABELS).map(([key, label]) => (
              <Card key={key} size="sm" className="p-3">
                <CardContent className="p-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 font-heading text-2xl font-semibold text-primary">{data.byType[key] ?? 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Top links</p>
              {data.topLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No link clicks yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.topLinks.map((l) => (
                    <div key={l.label} className="flex items-center justify-between text-sm">
                      <span className="truncate text-foreground">{l.label}</span>
                      <span className="font-semibold text-primary">{l.clicks}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Recent activity (30 days)</p>
              {data.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {data.recent
                    .slice()
                    .reverse()
                    .slice(0, 40)
                    .map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{EVENT_LABELS[r.eventType] ?? r.eventType}</span>
                        <span className="text-muted-foreground">{new Date(r.at).toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
