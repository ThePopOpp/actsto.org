"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";

import { CopyButton } from "@/components/proposals/admin/copy-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Signer } from "@/lib/proposals/musk-scholars-fund/content";

type Stats = { total: number; lastViewedAt: string | null; days: { day: string; views: number }[] };

/** The secret link (copy, open, on/off, regenerate), its views, and the signer. */
export function ProposalOverviewPanel({
  proposalKey,
  url,
  enabled,
  signer,
  stats,
  updatedByEmail,
}: {
  proposalKey: string;
  url: string;
  enabled: boolean;
  signer: Signer;
  stats: Stats;
  updatedByEmail: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: signer.name ?? "",
    title: signer.title ?? "",
    phone: signer.phone ?? "",
    email: signer.email ?? "",
  });

  async function patch(body: unknown) {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/admin/proposals/${proposalKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res.ok) {
      setError(data?.error ?? "Not saved.");
      return false;
    }
    router.refresh();
    return true;
  }

  const missing = (Object.keys(form) as (keyof typeof form)[]).filter((k) => !form[k].trim());
  const max = Math.max(1, ...stats.days.map((d) => d.views));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Private link</CardTitle>
          <CardDescription>
            Only people with this link can open the landing page. It isn&apos;t linked anywhere and search engines are told not to index it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                enabled ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
              }`}
            >
              <span className={`size-1.5 rounded-full ${enabled ? "bg-emerald-600" : "bg-muted-foreground"}`} />
              {enabled ? "Live: the link works" : "Off: the link shows Not found"}
            </span>
            <Button
              type="button"
              size="sm"
              variant={enabled ? "outline" : "default"}
              disabled={busy}
              onClick={() => {
                if (!enabled && missing.length && !window.confirm(`The signer's ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} blank. Turn the link on anyway?`)) return;
                void patch({ enabled: !enabled });
              }}
            >
              {enabled ? "Turn off" : "Turn on"}
            </Button>
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-3 font-mono text-xs break-all">{url}</div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={url} label="Copy link" />
            <Button type="button" size="sm" variant="outline" onClick={() => window.open(`/p/preview/${proposalKey}`, "_blank", "noopener")}>
              <ExternalLink className="mr-1.5 size-4" /> Preview
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Make a new link? The current link stops working immediately, for everyone you sent it to.")) {
                  void patch({ regenerateToken: true });
                }
              }}
            >
              <RefreshCw className="mr-1.5 size-4" /> New link
            </Button>
          </div>
          {!enabled ? (
            <p className="text-xs text-muted-foreground">Preview works while the link is off. Your own visits are never counted as views.</p>
          ) : null}

          <div className="border-t border-border pt-4">
            <p className="font-medium">Views</p>
            <p className="text-xs text-muted-foreground">
              {stats.total} visitor-day{stats.total === 1 ? "" : "s"} in total
              {stats.lastViewedAt ? `, last on ${new Date(stats.lastViewedAt).toLocaleString("en-US", { timeZone: "America/Phoenix", dateStyle: "medium", timeStyle: "short" })}` : ""}.
              One visitor counts once a day.
            </p>
            <div className="mt-3 flex h-16 items-end gap-1" aria-label="Views over the last 14 days">
              {stats.days.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.views}`}>
                  <div className="w-full rounded-sm bg-primary/70" style={{ height: `${Math.max(2, (d.views / max) * 56)}px`, opacity: d.views ? 1 : 0.25 }} />
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Last 14 days</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Signer</CardTitle>
          <CardDescription>Who the proposal comes from. Used on the landing page, email, one-pager and deck.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3 text-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await patch({ signer: form })) setSaved(true);
            }}
          >
            {missing.length ? (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertDescription>Still blank: {missing.join(", ")}. Blank fields are left out rather than shown as placeholders.</AlertDescription>
              </Alert>
            ) : null}
            {(
              [
                ["name", "Name", "text"],
                ["title", "Title", "text"],
                ["phone", "Phone", "tel"],
                ["email", "Email (replies and the intro-call button go here)", "email"],
              ] as const
            ).map(([k, label, type]) => (
              <div key={k}>
                <Label htmlFor={`signer-${k}`}>{label}</Label>
                <Input id={`signer-${k}`} type={type} className="mt-1.5" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            {error ? (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save signer"}
              </Button>
              {saved ? <span className="text-xs text-emerald-700 dark:text-emerald-400">Saved.</span> : null}
              {updatedByEmail ? <span className="text-xs text-muted-foreground">Last change by {updatedByEmail}</span> : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
