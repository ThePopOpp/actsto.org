"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DECISION_FACTORS,
  decisionApprovalError,
  normalizeDecision,
  type Appeal,
  type DecisionRecord,
  type NeedAssessment,
} from "@/lib/award-policy/decisions";
import { FUNDING_SOURCE_LABEL, FUNDING_SOURCES } from "@/lib/funding-sources";

export type DecisionData = DecisionRecord & {
  id: string;
  schoolYear: string | null;
  approvedAt: string | null;
  approvedByEmail: string | null;
  noticeSentAt: string | null;
  appealDeadline: string | null;
  lines: { awardId: string; fundingLabel: string; amount: number; campaign: string | null; status: string }[];
  suggestedNeed: NeedAssessment;
};

function usd(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

/**
 * The committee's record of one award (award policy, Oct 16, 2026): need
 * assessment, factors applied, two or more reviewers, the committee approval
 * with recusals, and appeals. Editable until approved; appeals after. Money
 * can't be sent to the school until the approval is recorded.
 */
export function DecisionRecordPanel({
  decision,
  onSave,
}: {
  decision: DecisionData;
  onSave: (body: Record<string, unknown>, ok: string) => Promise<void> | void;
}) {
  const locked = Boolean(decision.approvedAt);
  const prefill = (n: NeedAssessment, s: NeedAssessment): NeedAssessment => ({
    householdIncome: n.householdIncome ?? s.householdIncome,
    householdSize: n.householdSize ?? s.householdSize,
    pctOfRplLimit: n.pctOfRplLimit ?? s.pctOfRplLimit,
    tuition: n.tuition ?? s.tuition,
    otherAid: n.otherAid ?? s.otherAid,
    note: n.note,
  });
  const [record, setRecord] = useState<DecisionRecord>({
    ...decision,
    needAssessment: prefill(decision.needAssessment, decision.suggestedNeed),
    reviewers: decision.reviewers.length ? decision.reviewers : [{ name: "", amount: null, fundingSource: "" }, { name: "", amount: null, fundingSource: "" }],
  });
  const [appeal, setAppeal] = useState<Appeal>({ requestedOn: "", newInformation: "", decision: "", decidedOn: "" });
  const problem = decisionApprovalError(normalizeDecision(record));
  const total = decision.lines.filter((l) => l.status !== "reversed").reduce((s, l) => s + l.amount, 0);
  const need = record.needAssessment;
  const setNeed = (patch: Partial<NeedAssessment>) => setRecord((r) => ({ ...r, needAssessment: { ...r.needAssessment, ...patch } }));
  const numberField = (key: keyof Omit<NeedAssessment, "note">, label: string) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        className="mt-1"
        inputMode="decimal"
        disabled={locked}
        value={str(need[key])}
        onChange={(e) => setNeed({ [key]: e.target.value === "" ? null : Number(e.target.value.replace(/[^0-9.]/g, "")) } as Partial<NeedAssessment>)}
      />
    </div>
  );

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {usd(total)} award ·{" "}
            {decision.lines
              .filter((l) => l.status !== "reversed")
              .map((l) => `${l.fundingLabel}${l.campaign ? ` from ${l.campaign}` : ""}`)
              .join(" + ")}
          </p>
          {locked ? (
            <p className="text-xs text-muted-foreground">
              Approved {decision.approvedAt?.slice(0, 10)} by {decision.approvedByEmail}. Notice sent {decision.noticeSentAt?.slice(0, 10)};
              appeals due by <span className="font-medium text-foreground">{decision.appealDeadline}</span>.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Nothing can be sent to the school until the committee approval is recorded.</p>
          )}
        </div>
        <Badge variant={locked ? "secondary" : "outline"}>{locked ? "Approved" : "Not yet approved"}</Badge>
      </div>

      <fieldset className="space-y-2" disabled={locked}>
        <legend className="text-xs font-semibold uppercase text-muted-foreground">Need assessment</legend>
        <div className="grid gap-2 sm:grid-cols-5">
          {numberField("householdIncome", "Household income $")}
          {numberField("householdSize", "Household size")}
          {numberField("pctOfRplLimit", "% of RPL limit")}
          {numberField("tuition", "Tuition $")}
          {numberField("otherAid", "Other aid $")}
        </div>
        <Textarea placeholder="Need note" value={need.note} onChange={(e) => setNeed({ note: e.target.value })} className="min-h-[56px]" />
      </fieldset>

      <fieldset className="space-y-2" disabled={locked}>
        <legend className="text-xs font-semibold uppercase text-muted-foreground">Factors applied</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {DECISION_FACTORS.map((f) => (
            <label key={f.key} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                className="size-4"
                checked={Boolean(record.factors[f.key])}
                onChange={(e) => setRecord((r) => ({ ...r, factors: { ...r.factors, [f.key]: e.target.checked } }))}
              />
              {f.label}
            </label>
          ))}
        </div>
        <Textarea
          placeholder="Rationale (required)"
          value={record.factors.rationale ?? ""}
          onChange={(e) => setRecord((r) => ({ ...r, factors: { ...r.factors, rationale: e.target.value } }))}
          className="min-h-[56px]"
        />
      </fieldset>

      <fieldset className="space-y-2" disabled={locked}>
        <legend className="text-xs font-semibold uppercase text-muted-foreground">Reviewers (at least two)</legend>
        {record.reviewers.map((rev, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_8rem_14rem_auto] sm:items-center">
            <Input aria-label="Reviewer name" placeholder="Name" value={rev.name} onChange={(e) => setRecord((r) => ({ ...r, reviewers: r.reviewers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))} />
            <Input
              aria-label="Recommended amount"
              placeholder="Amount $"
              inputMode="decimal"
              value={str(rev.amount)}
              onChange={(e) =>
                setRecord((r) => ({
                  ...r,
                  reviewers: r.reviewers.map((x, j) => (j === i ? { ...x, amount: e.target.value === "" ? null : Number(e.target.value.replace(/[^0-9.]/g, "")) } : x)),
                }))
              }
            />
            <select
              aria-label="Recommended fund"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={rev.fundingSource}
              onChange={(e) => setRecord((r) => ({ ...r, reviewers: r.reviewers.map((x, j) => (j === i ? { ...x, fundingSource: e.target.value } : x)) }))}
            >
              <option value="">Fund…</option>
              {FUNDING_SOURCES.filter((s) => s !== "corporate_other").map((s) => (
                <option key={s} value={s}>
                  {FUNDING_SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
            <Button type="button" variant="ghost" size="sm" aria-label="Remove reviewer" onClick={() => setRecord((r) => ({ ...r, reviewers: r.reviewers.filter((_, j) => j !== i) }))}>
              <X className="size-4" />
            </Button>
          </div>
        ))}
        {!locked ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setRecord((r) => ({ ...r, reviewers: [...r.reviewers, { name: "", amount: null, fundingSource: "" }] }))}>
            <Plus className="mr-1 size-3.5" /> Add a reviewer
          </Button>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2" disabled={locked}>
        <legend className="text-xs font-semibold uppercase text-muted-foreground">Committee approval</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Award round</Label>
            <Input className="mt-1" value={record.committee.round} onChange={(e) => setRecord((r) => ({ ...r, committee: { ...r.committee, round: e.target.value } }))} />
          </div>
          <div>
            <Label className="text-xs">Meeting date</Label>
            <Input type="date" className="mt-1" value={record.committee.meetingDate} onChange={(e) => setRecord((r) => ({ ...r, committee: { ...r.committee, meetingDate: e.target.value } }))} />
          </div>
          <div>
            <Label className="text-xs">Vote result</Label>
            <Input className="mt-1" placeholder="e.g. 4-0" value={record.committee.vote} onChange={(e) => setRecord((r) => ({ ...r, committee: { ...r.committee, vote: e.target.value } }))} />
          </div>
        </div>
        {record.committee.recusals.map((rec, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-center">
            <Input aria-label="Recused member" placeholder="Member" value={rec.member} onChange={(e) => setRecord((r) => ({ ...r, committee: { ...r.committee, recusals: r.committee.recusals.map((x, j) => (j === i ? { ...x, member: e.target.value } : x)) } }))} />
            <Input aria-label="Reason for recusal" placeholder="Reason" value={rec.reason} onChange={(e) => setRecord((r) => ({ ...r, committee: { ...r.committee, recusals: r.committee.recusals.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)) } }))} />
            <Button type="button" variant="ghost" size="sm" aria-label="Remove recusal" onClick={() => setRecord((r) => ({ ...r, committee: { ...r.committee, recusals: r.committee.recusals.filter((_, j) => j !== i) } }))}>
              <X className="size-4" />
            </Button>
          </div>
        ))}
        {!locked ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setRecord((r) => ({ ...r, committee: { ...r.committee, recusals: [...r.committee.recusals, { member: "", reason: "" }] } }))}>
            <Plus className="mr-1 size-3.5" /> Add a recusal
          </Button>
        ) : null}
      </fieldset>

      {!locked ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              void onSave(
                { action: "decision_save", decisionId: decision.id, record: { needAssessment: record.needAssessment, factors: record.factors, reviewers: record.reviewers, committee: record.committee } },
                "Decision record saved.",
              )
            }
          >
            Save record
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={Boolean(problem)}
            onClick={() =>
              void (async () => {
                await onSave(
                  { action: "decision_save", decisionId: decision.id, record: { needAssessment: record.needAssessment, factors: record.factors, reviewers: record.reviewers, committee: record.committee } },
                  "Decision record saved.",
                );
                await onSave({ action: "decision_approve", decisionId: decision.id }, "Committee approval recorded. The family has been sent the award notice.");
              })()
            }
          >
            Record committee approval
          </Button>
          {problem ? <span className="text-xs text-muted-foreground">{problem}</span> : null}
        </div>
      ) : null}

      {locked ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Appeals (due by {decision.appealDeadline})</p>
          {record.appeals.length ? (
            <ul className="space-y-1 text-xs">
              {record.appeals.map((a, i) => (
                <li key={i}>
                  Requested {a.requestedOn}
                  {decision.appealDeadline && a.requestedOn > decision.appealDeadline ? " (after the 30-day deadline)" : ""}
                  {a.newInformation ? ` · ${a.newInformation}` : ""} · {a.decision ? `${a.decision} (${a.decidedOn || "date not set"})` : "pending"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No appeals.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
            <Input type="date" aria-label="Appeal requested on" value={appeal.requestedOn} onChange={(e) => setAppeal({ ...appeal, requestedOn: e.target.value })} />
            <Input aria-label="New information" placeholder="New information received" value={appeal.newInformation} onChange={(e) => setAppeal({ ...appeal, newInformation: e.target.value })} />
            <Input type="date" aria-label="Decided on" value={appeal.decidedOn} onChange={(e) => setAppeal({ ...appeal, decidedOn: e.target.value })} />
            <Input aria-label="Appeal decision" placeholder="Decision" value={appeal.decision} onChange={(e) => setAppeal({ ...appeal, decision: e.target.value })} />
          </div>
          {decision.appealDeadline && appeal.requestedOn > decision.appealDeadline ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">This request is after the 30-day appeal deadline.</p>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!appeal.requestedOn}
            onClick={() =>
              void (async () => {
                await onSave({ action: "decision_save", decisionId: decision.id, record: { appeals: [...record.appeals, appeal] } }, "Appeal recorded.");
                setAppeal({ requestedOn: "", newInformation: "", decision: "", decidedOn: "" });
              })()
            }
          >
            Record appeal
          </Button>
        </div>
      ) : null}
    </div>
  );
}
