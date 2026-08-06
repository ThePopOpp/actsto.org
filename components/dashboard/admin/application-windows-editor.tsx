"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Lock, LockOpen } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type WindowOverride = "auto" | "open" | "closed";

export type WindowRow = {
  id: string;
  schoolYear: string;
  opensAt: string;
  closesAt: string;
  lateGraceUntil: string | null;
  isPublished: boolean;
  manualOverride: WindowOverride;
  overrideNote: string | null;
  overrideAt: string | null;
  overrideByName: string | null;
  liveStatus: {
    acceptingNew: boolean;
    acceptingSubmissions: boolean;
    phase: string;
    reason: string;
  };
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
            No windows set up yet. Until one exists and is published, parents are told applications
            are closed.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {windows.map((window) => (
            <Card key={window.id} className="border-border/80">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{window.schoolYear}</p>
                      <StatusBadge window={window} />
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
                </div>

                <PlainEnglishStatus window={window} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing ? (
        <WindowForm window={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      ) : null}
    </div>
  );
}

function StatusBadge({ window }: { window: WindowRow }) {
  if (!window.isPublished) {
    return <Badge variant="outline">Draft — parents can&apos;t see this</Badge>;
  }
  if (window.manualOverride === "closed") {
    return <Badge variant="destructive">Closed by hand</Badge>;
  }
  if (window.manualOverride === "open") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Open by hand</Badge>;
  }
  if (window.liveStatus.acceptingNew) {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Open</Badge>;
  }
  if (window.liveStatus.acceptingSubmissions) {
    return <Badge variant="secondary">Grace period</Badge>;
  }
  return <Badge variant="secondary">Closed</Badge>;
}

/**
 * Say what a parent visiting right now would actually experience, and why.
 * "Closed" on its own leaves staff guessing whether it's the dates or the switch.
 */
function PlainEnglishStatus({ window }: { window: WindowRow }) {
  const { reason, acceptingNew, acceptingSubmissions } = window.liveStatus;

  const line =
    reason === "unpublished"
      ? "Not published, so parents see applications as closed no matter what the dates say."
      : reason === "forced_closed"
        ? "Switched off by hand. Parents can't start or submit an application, even though the dates may say otherwise."
        : reason === "forced_open"
          ? "Switched on by hand. Parents can apply and submit right now, regardless of the dates."
          : acceptingNew
            ? "Following the schedule. Parents can start and submit applications."
            : acceptingSubmissions
              ? "Following the schedule. Closed to new applications, but drafts already started can still be submitted."
              : "Following the schedule. Parents can't apply right now.";

  const manual = window.manualOverride !== "auto";

  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        manual ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-muted/40",
      )}
    >
      <p className="text-foreground">{line}</p>
      {manual && window.overrideByName ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Set by {window.overrideByName}
          {window.overrideAt ? ` on ${formatDate(window.overrideAt)}` : ""}
          {window.overrideNote ? ` — “${window.overrideNote}”` : ""}
        </p>
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
  const [manualOverride, setManualOverride] = useState<WindowOverride>(
    window?.manualOverride ?? "auto",
  );
  const [overrideNote, setOverrideNote] = useState(window?.overrideNote ?? "");
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
          manualOverride,
          overrideNote,
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
      <CardContent className="space-y-6">
        {/* ── Manual switch ───────────────────────────────────────────────── */}
        <fieldset className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium text-foreground">
            Are applications open?
          </legend>
          <p className="text-sm text-muted-foreground">
            Choose whether the dates below decide, or take control by hand. The manual settings
            ignore the dates completely.
          </p>

          <div className="grid gap-2 sm:grid-cols-3">
            <OverrideOption
              value="auto"
              current={manualOverride}
              onSelect={setManualOverride}
              icon={CalendarClock}
              title="Follow the dates"
              detail="Opens and closes on the schedule below."
            />
            <OverrideOption
              value="open"
              current={manualOverride}
              onSelect={setManualOverride}
              icon={LockOpen}
              title="Force open"
              detail="Accept applications now, whatever the dates say."
            />
            <OverrideOption
              value="closed"
              current={manualOverride}
              onSelect={setManualOverride}
              icon={Lock}
              title="Force closed"
              detail="Stop applications now, whatever the dates say."
            />
          </div>

          {manualOverride !== "auto" ? (
            <div>
              <Label htmlFor="w-override-note">Why (optional)</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Staff only — parents never see this. Useful when someone asks in three weeks why
                applications were shut.
              </p>
              <Textarea
                id="w-override-note"
                className="mt-1.5 min-h-16"
                placeholder="Paused while we work through the backlog."
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
              />
            </div>
          ) : null}
        </fieldset>

        {/* ── Dates ───────────────────────────────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-foreground">Schedule</legend>
          {manualOverride !== "auto" ? (
            <Alert>
              <AlertDescription>
                These dates are saved but{" "}
                <strong className="text-foreground">not in effect</strong> while the switch above is
                set to force {manualOverride}. Set it back to “Follow the dates” to use them.
              </AlertDescription>
            </Alert>
          ) : null}

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
                Lets families who already started a draft still submit. New applications stay
                closed.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Times are Arizona time. Arizona doesn&apos;t change clocks, so these dates hold all
            year.
          </p>
        </fieldset>

        <div className="flex items-start gap-3 border-t border-border pt-4">
          <Checkbox
            id="w-published"
            checked={isPublished}
            onCheckedChange={(checked) => setIsPublished(checked === true)}
          />
          <Label htmlFor="w-published" className="font-normal leading-snug">
            Published — parents can see this school year. Leave unticked while you&apos;re still
            setting it up; an unpublished year is closed to everyone regardless of the settings
            above.
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

function OverrideOption({
  value,
  current,
  onSelect,
  icon: Icon,
  title,
  detail,
}: {
  value: WindowOverride;
  current: WindowOverride;
  onSelect: (value: WindowOverride) => void;
  icon: typeof CalendarClock;
  title: string;
  detail: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
      )}
    >
      <span className="flex items-center gap-2 font-medium text-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        {title}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">{detail}</span>
    </button>
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
