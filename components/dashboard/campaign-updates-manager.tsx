"use client";

import { useState } from "react";
import { Megaphone, Pencil, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CampaignUpdateRow } from "@/lib/dashboard/campaign-updates";
import { formatLongDate } from "@/lib/utils";

/**
 * Write and manage the updates that appear on the campaign's public "Updates"
 * tab.
 *
 * Drafts stay private until published, so a family can write something and come
 * back to it without supporters seeing a half-finished note.
 */
export function CampaignUpdatesManager({
  slug,
  initialUpdates,
}: {
  slug: string;
  initialUpdates: CampaignUpdateRow[];
}) {
  const [updates, setUpdates] = useState(initialUpdates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setError(null);
  }

  function startEdit(update: CampaignUpdateRow) {
    setEditingId(update.id);
    setTitle(update.title);
    setBody(update.body);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(publish: boolean) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        editingId
          ? `/api/campaigns/${encodeURIComponent(slug)}/updates/${editingId}`
          : `/api/campaigns/${encodeURIComponent(slug)}/updates`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, publish }),
        },
      );
      const data = (await res.json().catch(() => null)) as
        | { updates?: CampaignUpdateRow[]; error?: string }
        | null;
      if (!res.ok || !data?.updates) throw new Error(data?.error ?? "Could not save this update.");

      setUpdates(data.updates);
      setNotice(publish ? "Update published to your campaign page." : "Draft saved.");
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this update.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(update: CampaignUpdateRow) {
    if (!window.confirm(`Delete "${update.title}"? Supporters will no longer see it.`)) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(slug)}/updates/${update.id}`,
        { method: "DELETE" },
      );
      const data = (await res.json().catch(() => null)) as
        | { updates?: CampaignUpdateRow[]; error?: string }
        | null;
      if (!res.ok || !data?.updates) throw new Error(data?.error ?? "Could not delete this update.");
      setUpdates(data.updates);
      if (editingId === update.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this update.");
    }
  }

  const published = updates.filter((u) => u.status === "published").length;

  return (
    <div className="space-y-5">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">
            {editingId ? "Edit update" : "Post an update"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Updates appear on your campaign page under the Updates tab. Supporters who gave are the
            most likely people to read them — a short note about how your student is doing goes a
            long way.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cu-title">Title</Label>
            <Input
              id="cu-title"
              className="mt-1.5"
              placeholder="First week of school"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cu-body">Update</Label>
            <Textarea
              id="cu-body"
              className="mt-1.5 min-h-40"
              placeholder="Tell your supporters what's happening."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {notice ? <p className="text-sm text-act-action">{notice}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void save(true)} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save and publish" : "Publish update"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void save(false)} disabled={saving}>
              Save as draft
            </Button>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold text-primary">Your updates</h2>
          <Badge variant="secondary">
            {published} published{updates.length > published ? ` · ${updates.length - published} draft` : ""}
          </Badge>
        </div>

        {updates.length === 0 ? (
          <Alert>
            <Megaphone className="size-4" />
            <AlertDescription>
              No updates yet. Your campaign page shows this tab as empty until you publish one.
            </AlertDescription>
          </Alert>
        ) : (
          updates.map((update) => (
            <Card key={update.id} className="border-border/80">
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{update.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {update.status === "published"
                        ? `Published ${formatLongDate(update.publishedAt)}`
                        : "Draft — not visible to supporters"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Badge variant={update.status === "published" ? "secondary" : "outline"}>
                      {update.status === "published" ? "Published" : "Draft"}
                    </Badge>
                    <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(update)}>
                      <Pencil className="size-3.5" aria-hidden />
                      <span className="sr-only">Edit {update.title}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void remove(update)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      <span className="sr-only">Delete {update.title}</span>
                    </Button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{update.body}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
