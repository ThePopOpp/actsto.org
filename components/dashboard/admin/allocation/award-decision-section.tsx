"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DECISION_FACTORS,
  decisionApprovalError,
  normalizeCommittee,
  type Appeal,
  type CommitteeApproval,
  type DecisionFactors,
  type DecisionStage,
} from "@/lib/award-policy/decisions";
import { formatDate } from "@/lib/format-date";

export type DecisionData = {
  id: string;
  schoolYear: string | null;
  factors: DecisionFactors;
  committee: CommitteeApproval;
  appeals: Appeal[];
  stage: DecisionStage;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  approvedAt: string | null;
  approvedByEmail: string | null;
  noticeSentAt: string | null;
  appealDeadline: string | null;
};

type Act = (body: Record<string, unknown>, ok: string) => Promise<void> | void;

/**
 * The decision on one award, inside its card: factors applied, one review
 * ("Mark reviewed" records who and when), the committee's approval as
 * allocated or its reversal, and appeals once approved. Money can't go to the
 * school until it is reviewed and approved.
 */
export function AwardDecisionSection({ decision, viewerId, act }: { decision: DecisionData; viewerId: string | null; act: Act }) {
  const approved = decision.stage === "approved";
  const [factors, setFactors] = useState<DecisionFactors>(decision.factors);
  const [committee, setCommittee] = useState<CommitteeApproval>(decision.committee);
  const [appeal, setAppeal] = useState<Appeal>({ requestedOn: "", newInformation: "", decision: "", decidedOn: "" });
  const reviewed = Boolean(decision.reviewedAt);
  const problem = decisionApprovalError({ reviewed, committee: normalizeCommittee(committee) });
  const setC = (patch: Partial<CommitteeApproval>) => setCommittee((c) => ({ ...c, ...patch }));

  return (
    <div className="space-y-4 pt-2">
      <fieldset className="space-y-2" disabled={approved}>
        <legend className="text-xs font-semibold uppercase text-muted-foreground">Factors applied</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {DECISION_FACTORS.map((f) => (
            <label key={f.key} className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" className="size-4" checked={factors[f.key]} onChange={(e) => setFactors({ ...factors, [f.key]: e.target.checked })} />
              {f.label}
            </label>
          ))}
        </div>
        <Textarea
          placeholder="Rationale (optional): anything unusual about this award"
          value={factors.rationale}
          onChange={(e) => setFactors({ ...factors, rationale: e.target.value })}
          className="min-h-[52px]"
        />
        {!approved ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void act({ action: "decision_save", decisionId: decision.id, record: { factors } }, "Factors saved.")}>
            Save factors
          </Button>
        ) : null}
      </fieldset>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Review</p>
        {reviewed ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span>
              Reviewed by <span className="font-medium text-foreground">{decision.reviewedByName ?? "staff"}</span>, {formatDate(decision.reviewedAt!)}
            </span>
            {!approved && viewerId && viewerId === decision.reviewedById ? (
              <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => void act({ action: "decision_unreview", decisionId: decision.id }, "Review undone.")}>
                Undo
              </Button>
            ) : null}
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() =>
              void (async () => {
                await act({ action: "decision_save", decisionId: decision.id, record: { factors } }, "Factors saved.");
                await act({ action: "decision_review", decisionId: decision.id }, "Marked reviewed.");
              })()
            }
          >
            Mark reviewed
          </Button>
        )}
      </div>

      {approved ? (
        <div className="space-y-2 text-xs">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Committee approval</p>
          <p>
            Approved as allocated {decision.approvedAt ? formatDate(decision.approvedAt) : ""} by {decision.approvedByEmail ?? "staff"}
            {decision.committee.meetingDate ? ` · meeting ${decision.committee.meetingDate}` : ""}
            {decision.committee.vote ? ` · vote ${decision.committee.vote}` : ""}
            {decision.committee.round ? ` · ${decision.committee.round}` : ""}
          </p>
          {decision.committee.recusals.length ? (
            <p className="text-muted-foreground">Recused: {decision.committee.recusals.map((r) => `${r.member} (${r.reason})`).join("; ")}</p>
          ) : null}
          <p className="text-muted-foreground">
            Notice sent {decision.noticeSentAt?.slice(0, 10)}; appeals due by <span className="font-medium text-foreground">{decision.appealDeadline}</span>.
          </p>

          <p className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Appeals</p>
          {decision.appeals.length ? (
            <ul className="space-y-1">
              {decision.appeals.map((a, i) => (
                <li key={i}>
                  Requested {a.requestedOn}
                  {decision.appealDeadline && a.requestedOn > decision.appealDeadline ? " (after the 30-day deadline)" : ""}
                  {a.newInformation ? ` · ${a.newInformation}` : ""} · {a.decision ? `${a.decision} (${a.decidedOn || "date not set"})` : "pending"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No appeals.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
            <Input type="date" aria-label="Appeal requested on" value={appeal.requestedOn} onChange={(e) => setAppeal({ ...appeal, requestedOn: e.target.value })} />
            <Input aria-label="New information" placeholder="New information received" value={appeal.newInformation} onChange={(e) => setAppeal({ ...appeal, newInformation: e.target.value })} />
            <Input type="date" aria-label="Decided on" value={appeal.decidedOn} onChange={(e) => setAppeal({ ...appeal, decidedOn: e.target.value })} />
            <Input aria-label="Appeal decision" placeholder="Decision" value={appeal.decision} onChange={(e) => setAppeal({ ...appeal, decision: e.target.value })} />
          </div>
          {decision.appealDeadline && appeal.requestedOn > decision.appealDeadline ? (
            <p className="text-amber-700 dark:text-amber-400">This request is after the 30-day appeal deadline.</p>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!appeal.requestedOn}
            onClick={() =>
              void (async () => {
                await act({ action: "decision_save", decisionId: decision.id, record: { appeals: [...decision.appeals, appeal] } }, "Appeal recorded.");
                setAppeal({ requestedOn: "", newInformation: "", decision: "", decidedOn: "" });
              })()
            }
          >
            Record appeal
          </Button>
        </div>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase text-muted-foreground">Committee approval</legend>
          <p className="text-xs text-muted-foreground">
            The committee approves this award as allocated, or reverses it so staff can reallocate a different amount or fund.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Meeting date</Label>
              <Input type="date" className="mt-1" value={committee.meetingDate} onChange={(e) => setC({ meetingDate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Vote result</Label>
              <Input className="mt-1" placeholder="e.g. 4-0" value={committee.vote} onChange={(e) => setC({ vote: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Award round (optional)</Label>
              <Input
                className="mt-1"
                placeholder={committee.meetingDate ? `Committee ${committee.meetingDate}` : "Defaults to the meeting date"}
                value={committee.round}
                onChange={(e) => setC({ round: e.target.value })}
              />
            </div>
          </div>
          {committee.recusals.map((rec, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-center">
              <Input aria-label="Recused member" placeholder="Member" value={rec.member} onChange={(e) => setC({ recusals: committee.recusals.map((x, j) => (j === i ? { ...x, member: e.target.value } : x)) })} />
              <Input aria-label="Reason for recusal" placeholder="Reason" value={rec.reason} onChange={(e) => setC({ recusals: committee.recusals.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)) })} />
              <Button type="button" variant="ghost" size="sm" aria-label="Remove recusal" onClick={() => setC({ recusals: committee.recusals.filter((_, j) => j !== i) })}>
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setC({ recusals: [...committee.recusals, { member: "", reason: "" }] })}>
              <Plus className="mr-1 size-3.5" /> Add a recusal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={Boolean(problem)}
              onClick={() =>
                void (async () => {
                  await act({ action: "decision_save", decisionId: decision.id, record: { factors } }, "Factors saved.");
                  await act({ action: "decision_approve", decisionId: decision.id, committee }, "Approved as allocated. The family has been sent the award notice.");
                })()
              }
            >
              Approve as allocated
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => {
                const reason = window.prompt("Why is the committee reversing this award? Staff can then reallocate.");
                if (reason) void act({ action: "decision_reverse", decisionId: decision.id, reason }, "Award reversed. Reallocate it if the committee wanted a different amount or fund.");
              }}
            >
              Reverse
            </Button>
            {problem ? <span className="text-xs text-muted-foreground">{problem}</span> : null}
          </div>
        </fieldset>
      )}
    </div>
  );
}
