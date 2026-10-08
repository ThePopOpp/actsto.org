"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ELIGIBILITY_FLAGS, FLAG_LABEL, FLAG_STATUS_LABEL, FLAG_STATUSES, type EligibilityFlag, type FlagStatus } from "@/lib/eligibility/flags";
import { GRADE_OPTIONS } from "@/lib/grades";

/** Set a flag by hand, with a required reason. */
export function OverrideFlagButton({
  studentId,
  studentName,
  flag,
  schoolYear,
  status,
  label = "Override",
}: {
  studentId: string;
  studentName: string;
  flag?: EligibilityFlag;
  schoolYear?: string;
  status?: FlagStatus;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    flag: flag ?? ("low_income" as EligibilityFlag),
    schoolYear: schoolYear && schoolYear !== "K-12" ? schoolYear : "",
    status: status ?? ("approved" as FlagStatus),
    reason: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "override", studentId, ...form }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res.ok) {
      setError(data?.error ?? "Not saved.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open ? (
        <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-primary">Set eligibility for {studentName}</DialogTitle>
              <DialogDescription>Overrides are recorded with your name, the time and your reason.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <Label htmlFor="ov-flag">Flag</Label>
                <select
                  id="ov-flag"
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2"
                  value={form.flag}
                  onChange={(e) => setForm({ ...form, flag: e.target.value as EligibilityFlag })}
                >
                  {ELIGIBILITY_FLAGS.map((f) => (
                    <option key={f} value={f}>
                      {FLAG_LABEL[f]}
                    </option>
                  ))}
                </select>
              </div>
              {form.flag !== "displaced" ? (
                <div>
                  <Label htmlFor="ov-year">School year</Label>
                  <Input id="ov-year" className="mt-1.5" placeholder="2026/2027" value={form.schoolYear} onChange={(e) => setForm({ ...form, schoolYear: e.target.value.trim() })} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Displaced status covers all of K-12 and is not set per year.</p>
              )}
              <div>
                <Label htmlFor="ov-status">Status</Label>
                <select
                  id="ov-status"
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as FlagStatus })}
                >
                  {FLAG_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FLAG_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ov-reason">Reason (required)</Label>
                <Textarea id="ov-reason" className="mt-1.5" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              {error ? (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="button" disabled={busy || !form.reason.trim()} onClick={() => void save()}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

/** Fix one free-text grade to a value from the shared list. */
export function FixGradeControl({ kind, id, suggestion }: { kind: "student" | "application"; id: string; suggestion: string | null }) {
  const router = useRouter();
  const [grade, setGrade] = useState(suggestion ?? "");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Grade"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
      >
        <option value="">Choose…</option>
        {GRADE_OPTIONS.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!grade}
        onClick={async () => {
          setError(null);
          const res = await fetch("/api/admin/eligibility/grade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, id, grade }),
          });
          if (!res.ok) setError("Not saved.");
          else router.refresh();
        }}
      >
        Save
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
