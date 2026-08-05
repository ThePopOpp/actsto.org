"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type WindowRow = {
  id: string;
  schoolYear: string;
  opensAt: string;
  closesAt: string;
  lateGraceUntil: string | null;
  isPublished: boolean;
};

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` with no zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ApplicationWindowsEditor({ windows }: { windows: WindowRow[] }) {
  const [editing, setEditing] = useState<WindowRow | "new" | null>(null);

  return (
    <div className="space-y-4">
      <Button type="button" onClick={() => setEditing("new")}>
        Add a school year
      </Button>

      {windows.length === 0 ? (
        <Card className="border-border/80">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No windows set up yet. Until one exists and is published, parents can&apos;t start an
            application.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {windows.map((window) => (
            <Card key={window.id} className="border-border/80">
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{window.schoolYear}</p>
                    <Badge variant={window.isPublished ? "secondary" : "outline"}>
                      {window.isPublished ? "Published" : "Draft — parents can't see this"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {formatRange(window.opensAt, window.closesAt)}
                  </p>
                  {window.lateGraceUntil ? (
                    <p className="text-xs text-muted-foreground">
                      Drafts already started may still submit until{" "}
                      {formatDate(window.lateGraceUntil)}.
                    </p>
                  ) : null}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(window)}>
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing ? (
        <WindowForm
          window={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function WindowForm({ window, onDone }: { window: WindowRow | null; onDone: () => void }) {
  const router = useRouter();
  const [schoolYear, setSchoolYear] = useState(window?.schoolYear ?? "");
  const [opensAt, setOpensAt] = useState(toLocalInput(window?.opensAt ?? null));
  const [closesAt, setClosesAt] = useState(toLocalInput(window?.closesAt ?? null));
  const [lateGraceUntil, setLateGraceUntil] = useState(toLocalInput(window?.lateGraceUntil ?? null));
  const [isPublished, setIsPublished] = useState(window?.isPublished ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/scholarship-windows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolYear,
          opensAt: opensAt ? new Date(opensAt).toISOString() : null,
          closesAt: closesAt ? new Date(closesAt).toISOString() : null,
          lateGraceUntil: lateGraceUntil ? new Date(lateGraceUntil).toISOString() : null,
          isPublished,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Could not save this window.");
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this window.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="font-heading text-base text-primary">
          {window ? `Edit ${window.schoolYear}` : "Add a school year"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="w-year">School year</Label>
            <Input
              id="w-year"
              className="mt-1.5"
              placeholder="2026/2027"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              disabled={Boolean(window)}
            />
          </div>
          <div>
            <Label htmlFor="w-opens">Opens</Label>
            <Input
              id="w-opens"
              type="datetime-local"
              className="mt-1.5"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="w-closes">Closes</Label>
            <Input
              id="w-closes"
              type="datetime-local"
              className="mt-1.5"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="w-grace">Late grace until (optional)</Label>
            <Input
              id="w-grace"
              type="datetime-local"
              className="mt-1.5"
              value={lateGraceUntil}
              onChange={(e) => setLateGraceUntil(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Lets families who already started a draft still submit. New applications stay closed.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="w-published"
            checked={isPublished}
            onCheckedChange={(checked) => setIsPublished(checked === true)}
          />
          <Label htmlFor="w-published" className="font-normal leading-snug">
            Published — parents can see these dates and apply once it opens.
          </Label>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRange(from: string, to: string): string {
  return `${formatDate(from)} — ${formatDate(to)}`;
}
