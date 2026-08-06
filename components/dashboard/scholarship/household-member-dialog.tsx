"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCurrency,
  FREQUENCY_LABELS,
  INCOME_CATEGORIES,
  INCOME_FREQUENCIES,
  memberAnnualTotal,
  toAnnual,
  type HouseholdMemberView,
  type IncomeFrequency,
} from "@/lib/scholarship/income";

/**
 * Add or edit one household member.
 *
 * The footer total updates as you type, so a parent can see what a frequency
 * change actually does before they save it — the difference between "biweekly"
 * and "semimonthly" is two paychecks a year and is easy to pick wrong.
 */

type FormState = {
  fullName: string;
  roleLabel: string;
  workAmount: string;
  workFrequency: IncomeFrequency;
  supportAmount: string;
  supportFrequency: IncomeFrequency;
  retirementAmount: string;
  retirementFrequency: IncomeFrequency;
  otherAmount: string;
  otherFrequency: IncomeFrequency;
};

function initialState(member: HouseholdMemberView | null): FormState {
  const amount = (value: number) => (value ? String(value) : "");
  return {
    fullName: member?.fullName ?? "",
    roleLabel: member?.roleLabel ?? "",
    workAmount: amount(member?.workAmount ?? 0),
    workFrequency: member?.workFrequency ?? "annually",
    supportAmount: amount(member?.supportAmount ?? 0),
    supportFrequency: member?.supportFrequency ?? "annually",
    retirementAmount: amount(member?.retirementAmount ?? 0),
    retirementFrequency: member?.retirementFrequency ?? "annually",
    otherAmount: amount(member?.otherAmount ?? 0),
    otherFrequency: member?.otherFrequency ?? "annually",
  };
}

const numeric = (value: string) => {
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Add or edit one household member.
 *
 * `open` is a prop and the component stays mounted, deliberately. Rendering it
 * as `{editing ? <Dialog/> : null}` unmounts it mid-close, so the scroll lock it
 * put on `<body>` is never lifted — which on iOS Safari leaves the page unable
 * to scroll and looking frozen.
 */
export function HouseholdMemberDialog({
  open,
  member,
  onClose,
  onSaved,
}: {
  open: boolean;
  member: HouseholdMemberView | null;
  onClose: () => void;
  onSaved: (members: HouseholdMemberView[]) => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(member));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runningTotal = useMemo(
    () =>
      memberAnnualTotal({
        fullName: form.fullName,
        roleLabel: form.roleLabel || null,
        workAmount: numeric(form.workAmount),
        workFrequency: form.workFrequency,
        supportAmount: numeric(form.supportAmount),
        supportFrequency: form.supportFrequency,
        retirementAmount: numeric(form.retirementAmount),
        retirementFrequency: form.retirementFrequency,
        otherAmount: numeric(form.otherAmount),
        otherFrequency: form.otherFrequency,
      }),
    [form],
  );

  function patch(next: Partial<FormState>) {
    setForm((state) => ({ ...state, ...next }));
    setError(null);
  }

  async function save() {
    if (!form.fullName.trim()) {
      setError("Enter a name for this person.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        roleLabel: form.roleLabel.trim() || null,
        workAmount: numeric(form.workAmount),
        workFrequency: form.workFrequency,
        supportAmount: numeric(form.supportAmount),
        supportFrequency: form.supportFrequency,
        retirementAmount: numeric(form.retirementAmount),
        retirementFrequency: form.retirementFrequency,
        otherAmount: numeric(form.otherAmount),
        otherFrequency: form.otherFrequency,
      };

      const res = await fetch(
        member ? `/api/scholarship/household/${member.id}` : "/api/scholarship/household",
        {
          method: member ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json().catch(() => null)) as
        | { members?: HouseholdMemberView[]; error?: string }
        | null;
      if (!res.ok || !data?.members) {
        throw new Error(data?.error ?? "Could not save this person.");
      }
      onSaved(data.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this person.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent showCloseButton className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">
            {member ? `Edit ${member.fullName}` : "Add a household member"}
          </DialogTitle>
          <DialogDescription>
            Enter income the way this person actually receives it. We&apos;ll work out the yearly
            figure. Leave anything that doesn&apos;t apply at zero.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="hm-name">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hm-name"
                value={form.fullName}
                onChange={(e) => patch({ fullName: e.target.value })}
                className="mt-1.5"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <Label htmlFor="hm-role">
                Role <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="hm-role"
                value={form.roleLabel}
                onChange={(e) => patch({ roleLabel: e.target.value })}
                className="mt-1.5"
                placeholder="Parent, Child, Student · 8th grade"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4">
            {INCOME_CATEGORIES.map((category) => {
              const amountKey = `${category.key}Amount` as keyof FormState;
              const freqKey = `${category.key}Frequency` as keyof FormState;
              const amount = numeric(form[amountKey] as string);
              const frequency = form[freqKey] as IncomeFrequency;
              const annual = toAnnual(amount, frequency);

              return (
                <div key={category.key} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div>
                    <Label htmlFor={`hm-${category.key}`}>{category.label}</Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">{category.hint}</p>
                    <div className="relative mt-1.5">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                      >
                        $
                      </span>
                      <Input
                        id={`hm-${category.key}`}
                        type="text"
                        inputMode="decimal"
                        className="pl-7 tabular-nums"
                        placeholder="0"
                        value={form[amountKey] as string}
                        onChange={(e) => patch({ [amountKey]: e.target.value } as Partial<FormState>)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`hm-${category.key}-freq`}>How often</Label>
                    <Select
                      value={frequency}
                      onValueChange={(v) =>
                        patch({ [freqKey]: (v ?? "annually") as IncomeFrequency } as Partial<FormState>)
                      }
                    >
                      <SelectTrigger id={`hm-${category.key}-freq`} className="mt-1.5 h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INCOME_FREQUENCIES.map((f) => (
                          <SelectItem key={f} value={f}>
                            {FREQUENCY_LABELS[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="pb-2 text-right text-sm tabular-nums text-muted-foreground sm:min-w-24">
                    {formatCurrency(annual)}
                    <span className="sr-only"> a year from {category.label.toLowerCase()}</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3"
          >
            <span className="text-sm font-medium">Yearly total for this person</span>
            <span className="font-heading text-xl font-semibold tabular-nums text-primary">
              {formatCurrency(runningTotal)}
            </span>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : member ? "Save changes" : "Add member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
