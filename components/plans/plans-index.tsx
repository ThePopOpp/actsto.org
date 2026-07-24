"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Users } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { PLAN_COLORS, PLAN_ICONS, planColor, planIcon } from "@/lib/plans/constants";
import type { PlanSummary } from "@/lib/plans/types";
import { cn } from "@/lib/utils";

export function PlansIndex({ myEmail }: { myEmail: string }) {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "mine" | "shared">("all");
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/plans", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { plans?: PlanSummary[] } | null;
    if (res.ok && data) setPlans(data.plans ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const mine = (p: PlanSummary) => p.ownerEmail.toLowerCase() === myEmail.toLowerCase();
  const filtered = plans.filter((p) => (filter === "all" ? true : filter === "mine" ? mine(p) : !mine(p)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
          {([
            { id: "all", label: "All plans" },
            { id: "mine", label: "Owned by me" },
            { id: "shared", label: "Shared with me" },
          ] as const).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" /> New plan
        </Button>
      </div>

      {loading ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No plans yet. Click <strong>New plan</strong> to organise work into tasks, groups, and boards.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const Icon = planIcon(p.icon);
            const color = planColor(p.color);
            const pct = p.taskCount > 0 ? Math.round((p.completedCount / p.taskCount) * 100) : 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => router.push(`/dashboard/admin/plans/${p.id}`)}
                className="text-left"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", color.swatch)}>
                        <Icon className="size-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-heading font-semibold text-primary">{p.name}</p>
                        {p.description ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p> : null}
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{p.completedCount}/{p.taskCount} tasks done</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{mine(p) ? "Owned by you" : `Shared · ${p.ownerName ?? p.ownerEmail}`}</span>
                      {p.memberCount > 0 ? (
                        <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{p.memberCount}</span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      <CreatePlanDialog open={open} onOpenChange={setOpen} onCreated={(id) => router.push(`/dashboard/admin/plans/${id}`)} />
    </div>
  );
}

function CreatePlanDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("gold");
  const [icon, setIcon] = useState("clipboard-list");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, color, icon }),
      });
      const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok || !data?.id) throw new Error(data?.error ?? "Could not create plan.");
      onCreated(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">New plan</DialogTitle>
          <DialogDescription>Start from scratch — you get To Do / In Progress / Waiting / Completed columns.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Plan name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 6-Week Challenge Launch" className="mt-1" autoFocus />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Color</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {PLAN_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn("size-7 rounded-full ring-2 ring-offset-2 ring-offset-background", c.swatch, color === c.value ? "ring-primary" : "ring-transparent")}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Icon</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {PLAN_ICONS.map((i) => {
                const Icon = i.icon;
                return (
                  <button
                    key={i.value}
                    type="button"
                    onClick={() => setIcon(i.value)}
                    className={cn("flex size-8 items-center justify-center rounded-md border", icon === i.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}
                  >
                    <Icon className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" onClick={() => void create()} disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Create plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
