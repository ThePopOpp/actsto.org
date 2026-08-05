"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HouseholdMemberDialog } from "@/components/dashboard/scholarship/household-member-dialog";
import {
  formatCurrency,
  householdAnnualTotal,
  initialsOf,
  memberAnnualTotal,
  toAnnual,
  type HouseholdMemberView,
  type IncomeFrequency,
} from "@/lib/scholarship/income";
import { FREQUENCY_SUFFIX } from "@/lib/scholarship/income";
import { cn } from "@/lib/utils";

/**
 * The household income ledger, shared by the wizard's financial step and the
 * standalone income page.
 *
 * Both render this same component against the same rows, so an edit made in one
 * place shows up in the other. Do not fork it into a per-page variant.
 */

export type HouseholdIncomeLedgerProps = {
  initialMembers: HouseholdMemberView[];
  initialLastUpdated: string | null;
  readOnly?: boolean;
  /** Fires after any successful mutation, so a parent step can clear its confirmation. */
  onChanged?: (members: HouseholdMemberView[]) => void;
};

export function HouseholdIncomeLedger({
  initialMembers,
  initialLastUpdated,
  readOnly = false,
  onChanged,
}: HouseholdIncomeLedgerProps) {
  const [members, setMembers] = useState(initialMembers);
  const [lastUpdated, setLastUpdated] = useState(initialLastUpdated);
  const [dialogFor, setDialogFor] = useState<HouseholdMemberView | "new" | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const liveRegion = useRef<HTMLParagraphElement>(null);

  const annualTotal = useMemo(() => householdAnnualTotal(members), [members]);

  const applyChange = useCallback(
    (next: HouseholdMemberView[]) => {
      setMembers(next);
      setLastUpdated(new Date().toISOString());
      onChanged?.(next);
    },
    [onChanged],
  );

  // Currency totals change without a page transition, so announce them.
  useEffect(() => {
    if (liveRegion.current) {
      liveRegion.current.textContent = `Household total ${formatCurrency(annualTotal)} a year across ${members.length} ${members.length === 1 ? "person" : "people"}.`;
    }
  }, [annualTotal, members.length]);

  async function removeMember(member: HouseholdMemberView) {
    setPendingId(member.id);
    setError(null);
    try {
      const res = await fetch(`/api/scholarship/household/${member.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as
        | { members?: HouseholdMemberView[]; error?: string }
        | null;
      if (!res.ok || !data?.members) {
        throw new Error(data?.error ?? "Could not remove this person.");
      }
      applyChange(data.members);
      setRemovingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this person.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/80 p-0">
        {/* Summary header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-primary/5 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Household income
            </p>
            <p className="font-heading text-3xl font-semibold tabular-nums text-primary">
              {formatCurrency(annualTotal)}
            </p>
            <p className="text-sm text-muted-foreground">
              a year across {members.length} {members.length === 1 ? "person" : "people"}
            </p>
          </div>
          {!readOnly ? (
            <Button type="button" className="gap-2" onClick={() => setDialogFor("new")}>
              <Plus className="size-4" />
              Add a member
            </Button>
          ) : null}
        </div>

        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="space-y-3 px-5 py-12 text-center">
              <Users className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <p className="font-heading text-lg font-semibold text-primary">
                No one listed yet
              </p>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Start with yourself, then add everyone else who lives with you and shares income
                and expenses — including anyone earning nothing.
              </p>
              {!readOnly ? (
                <Button type="button" variant="outline" className="gap-2" onClick={() => setDialogFor("new")}>
                  <Plus className="size-4" />
                  Add the first member
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">
                  Household members and their annualized income
                </caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-5 py-3 font-medium">Member</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Employment</th>
                    {/* Collapsed below md; Employment and the yearly total stay. */}
                    <th scope="col" className="hidden px-3 py-3 text-right font-medium md:table-cell">Support</th>
                    <th scope="col" className="hidden px-3 py-3 text-right font-medium md:table-cell">Retirement</th>
                    <th scope="col" className="hidden px-3 py-3 text-right font-medium md:table-cell">Other</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Yearly total</th>
                    {!readOnly ? (
                      <th scope="col" className="px-5 py-3 text-right font-medium">Manage</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-border/60 last:border-0">
                      <th scope="row" className="px-5 py-4 text-left font-normal">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary"
                          >
                            {initialsOf(member.fullName)}
                          </span>
                          <span>
                            <span className="block font-medium text-foreground">{member.fullName}</span>
                            {member.roleLabel ? (
                              <span className="block text-xs text-muted-foreground">{member.roleLabel}</span>
                            ) : null}
                          </span>
                        </div>
                      </th>
                      <AmountCell amount={member.workAmount} frequency={member.workFrequency} />
                      <AmountCell amount={member.supportAmount} frequency={member.supportFrequency} hideOnMobile />
                      <AmountCell amount={member.retirementAmount} frequency={member.retirementFrequency} hideOnMobile />
                      <AmountCell amount={member.otherAmount} frequency={member.otherFrequency} hideOnMobile />
                      <td className="px-3 py-4 text-right font-medium tabular-nums text-foreground">
                        {formatCurrency(memberAnnualTotal(member))}
                      </td>
                      {!readOnly ? (
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => setDialogFor(member)}
                            >
                              <Pencil className="size-3.5" aria-hidden />
                              <span className="sr-only sm:not-sr-only">Edit</span>
                              <span className="sr-only"> {member.fullName}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-destructive hover:text-destructive"
                              onClick={() => setRemovingId(member.id)}
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                              <span className="sr-only">Remove {member.fullName}</span>
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {members.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
            <span>
              {lastUpdated
                ? `Income last updated ${new Date(lastUpdated).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}`
                : "Income not updated yet"}
            </span>
            <Badge variant="secondary" className="tabular-nums">
              {members.length} {members.length === 1 ? "member" : "members"}
            </Badge>
          </div>
        ) : null}
      </Card>

      <p ref={liveRegion} role="status" aria-live="polite" className="sr-only" />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Remove confirmation — states the consequence rather than asking "are you sure". */}
      {removingId ? (
        <RemoveConfirm
          member={members.find((m) => m.id === removingId)!}
          pending={pendingId === removingId}
          onCancel={() => setRemovingId(null)}
          onConfirm={removeMember}
        />
      ) : null}

      {dialogFor ? (
        <HouseholdMemberDialog
          member={dialogFor === "new" ? null : dialogFor}
          onClose={() => setDialogFor(null)}
          onSaved={(next) => {
            applyChange(next);
            setDialogFor(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** A zero renders muted rather than blank — a zero is meaningful data. */
function AmountCell({
  amount,
  frequency,
  hideOnMobile,
}: {
  amount: number;
  frequency: IncomeFrequency;
  hideOnMobile?: boolean;
}) {
  const annual = toAnnual(amount, frequency);
  return (
    <td
      className={cn(
        "px-3 py-4 text-right tabular-nums",
        hideOnMobile && "hidden md:table-cell",
        annual === 0 ? "text-muted-foreground/60" : "text-foreground",
      )}
    >
      {formatCurrency(annual)}
      {annual > 0 && frequency !== "annually" ? (
        <span className="block text-[11px] text-muted-foreground">
          {formatCurrency(amount)} {FREQUENCY_SUFFIX[frequency]}
        </span>
      ) : null}
    </td>
  );
}

function RemoveConfirm({
  member,
  pending,
  onCancel,
  onConfirm,
}: {
  member: HouseholdMemberView;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (member: HouseholdMemberView) => void;
}) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm">
          Remove <strong className="text-foreground">{member.fullName}</strong> from your household?
          Your household total drops by {formatCurrency(memberAnnualTotal(member))} a year, and any
          application you haven&apos;t submitted will need its income confirmed again.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
            Keep them
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onConfirm(member)}
            disabled={pending}
          >
            {pending ? "Removing…" : "Remove"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
