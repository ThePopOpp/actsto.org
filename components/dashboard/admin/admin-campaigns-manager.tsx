"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

import { AdminCampaignFormFull } from "@/components/dashboard/admin/admin-campaign-form-full";
import { CampaignCard } from "@/components/campaign-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { seedAdminCampaignRows } from "@/lib/admin/campaign-directory-seed";
import {
  removeAdminCampaignRow,
  upsertAdminCampaignRow,
} from "@/lib/admin/campaign-library-storage";
import type { AdminCampaignRow, CampaignModerationStatus } from "@/lib/admin/mock-campaigns-admin";
import type { Campaign } from "@/lib/campaigns";
import {
  campaignToFormValues,
  emptyCampaignFormValues,
} from "@/lib/dashboard/campaign-editor";

function modBadge(status: CampaignModerationStatus) {
  switch (status) {
    case "pending":
      return <Badge variant="outline">Pending</Badge>;
    case "approved":
      return <Badge variant="secondary">Approved</Badge>;
    case "featured":
      return <Badge className="border-act-red/30 bg-act-red/10 text-act-red">Featured</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return null;
  }
}

export function AdminCampaignsManager() {
  const [rows, setRows] = useState<AdminCampaignRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const [screen, setScreen] = useState<"table" | "editor">("table");
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/campaigns-directory");
      const data = (await res.json().catch(() => null)) as {
        rows?: AdminCampaignRow[];
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to load campaigns.");
      }
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load campaigns.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const editingRow = useMemo(
    () => (editingSlug && rows ? rows.find((r) => r.slug === editingSlug) : undefined),
    [editingSlug, rows]
  );

  const reservedSlugs = useMemo(() => {
    if (!rows) return [];
    return rows.map((r) => r.slug).filter((s) => s !== (editingSlug ?? ""));
  }, [rows, editingSlug]);

  async function persistRows(next: AdminCampaignRow[]) {
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/campaigns-directory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: next }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to save campaigns.");
      }
      setRows(next);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed.");
      throw e;
    }
  }

  function handleCreateClick() {
    setEditorMode("create");
    setEditingSlug(null);
    setScreen("editor");
  }

  function handleEditClick(slug: string) {
    setEditorMode("edit");
    setEditingSlug(slug);
    setScreen("editor");
  }

  async function handleSaveFromForm(campaign: Campaign, oldSlug: string | null) {
    if (!rows) return;
    const next = upsertAdminCampaignRow(rows, campaign, oldSlug);
    try {
      await persistRows(next);
      setScreen("table");
      setEditingSlug(null);
    } catch {
      /* saveError set in persistRows */
    }
  }

  async function confirmDelete() {
    if (!deleteSlug || !rows) return;
    const next = removeAdminCampaignRow(rows, deleteSlug);
    try {
      await persistRows(next);
      setDeleteSlug(null);
    } catch {
      /* saveError set */
    }
  }

  async function resetDemoData() {
    if (
      !window.confirm(
        "Replace the campaign directory with the built-in demo set? This updates the database for all admins."
      )
    ) {
      return;
    }
    try {
      await persistRows(seedAdminCampaignRows());
      setScreen("table");
      setEditingSlug(null);
    } catch {
      /* saveError set */
    }
  }

  if (!rows) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading campaigns…
      </p>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">{loadError}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void loadCampaigns()}>
          Retry
        </Button>
      </div>
    );
  }

  if (screen === "editor") {
    const initial =
      editorMode === "edit" && editingRow
        ? campaignToFormValues(editingRow)
        : emptyCampaignFormValues();
    const previous = editorMode === "edit" && editingRow ? editingRow : undefined;

    return (
      <AdminCampaignFormFull
        mode={editorMode}
        initial={initial}
        previousCampaign={previous}
        existingSlugs={reservedSlugs}
        onSave={handleSaveFromForm}
        onCancel={() => {
          setScreen("table");
          setEditingSlug(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {saveError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {saveError}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            Create, edit, or delete campaigns with the full tabbed form (Campaign · Parent · Student · School). Changes
            are stored in the database (Super Admin campaign directory) and used for admin counts; public campaign pages
            can be wired to the same source when you are ready.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" className="gap-1.5" onClick={handleCreateClick}>
            <Plus className="size-4" aria-hidden />
            Create campaign
          </Button>
          <div className="flex w-fit rounded-lg border border-border bg-muted/30 p-0.5">
            <Button
              type="button"
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 rounded-md px-3"
              onClick={() => setView("list")}
            >
              <List className="size-4" />
              List
            </Button>
            <Button
              type="button"
              variant={view === "grid" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 rounded-md px-3"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="size-4" />
              Grid
            </Button>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <Card className="overflow-hidden border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Parent / lead</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Progress</th>
                  <th className="px-4 py-3 text-right">Goal</th>
                  <th className="px-4 py-3">Days left</th>
                  <th className="px-4 py-3">Reviewer</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const pct = c.goal > 0 ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;
                  return (
                    <tr
                      key={c.slug}
                      className="border-b border-border/80 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/campaigns/${c.slug}`}
                          className="font-medium text-primary hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {c.title}
                        </Link>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.tagline}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{c.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.parent.name}</td>
                      <td className="px-4 py-3">{modBadge(c.moderationStatus)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="ml-auto max-w-[140px]">
                          <div className="flex justify-between text-xs tabular-nums">
                            <span>{pct}%</span>
                            <span className="text-muted-foreground">${c.raised.toLocaleString()}</span>
                          </div>
                          <Progress value={pct} className="mt-1 h-1.5" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        ${c.goal.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{c.daysLeft}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.reviewer}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 px-2"
                            onClick={() => handleEditClick(c.slug)}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 px-2 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteSlug(c.slug)}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <div key={c.slug} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                {modBadge(c.moderationStatus)}
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => handleEditClick(c.slug)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-destructive"
                    onClick={() => setDeleteSlug(c.slug)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <CampaignCard campaign={c} variant="listing" />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => void resetDemoData()}>
          <RotateCcw className="size-4" aria-hidden />
          Reset demo data
        </Button>
        <p className="text-xs text-muted-foreground">
          Table filters and CSV export can plug in here when your moderation workflow is ready.
        </p>
      </div>

      <Dialog open={deleteSlug !== null} onOpenChange={(open) => !open && setDeleteSlug(null)}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete campaign?</DialogTitle>
            <DialogDescription>
              Remove <strong className="text-foreground">{deleteSlug}</strong> from the campaign directory in the
              database. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteSlug(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
