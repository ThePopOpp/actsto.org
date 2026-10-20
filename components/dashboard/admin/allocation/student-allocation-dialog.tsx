"use client";

import { useCallback, useEffect, useState } from "react";

import { AwardDecisionSection, type DecisionData } from "@/components/dashboard/admin/allocation/award-decision-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CampaignFundRow } from "@/lib/allocation/campaign-funds";
import type { StudentEligibility } from "@/lib/allocation/rules";
import { spedLabel } from "@/lib/award-policy/disability";
import { awardCardStatus } from "@/lib/award-policy/decisions";
import { ddBandLabel, ESA_STATUSES, OTHER_STO_PROGRAMS } from "@/lib/award-policy/limits";
import { formatDate, isoDateInArizona } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type Payment = {
  id: string;
  amount: number;
  returned: number;
  returnNote: string | null;
  paidAt: string;
  reference: string | null;
  status: string;
  voidReason: string | null;
  tuitionOverrideReason: string | null;
};

type AwardRow = {
  id: string;
  decisionId: string | null;
  fundingSource: string;
  fundingLabel: string;
  amount: number;
  status: string;
  reversalReason: string | null;
  reversedAt: string | null;
  reversedByEmail: string | null;
  note: string | null;
  campaignTitle: string | null;
  /** Campaign id, "general", or null for an older award with no campaign. */
  campaignKey: string | null;
  allocationGroupId: string | null;
  createdAt: string;
  createdByEmail: string | null;
  sent: number;
  payable: number;
  payments: Payment[];
};

type Need = {
  householdIncome: number | null;
  householdSize: number | null;
  pctOfRplLimit: number | null;
  tuition: number | null;
  otherSto: number;
  otherStoCount: number;
  actSent: number;
  tuitionRoom: number | null;
};

type Detail = {
  student: { id: string; name: string; school: string | null; grade: string | null };
  viewerId: string | null;
  eligibility: StudentEligibility;
  needAssessment: Need;
  money: {
    tuitionCeiling: number | null;
    tuitionSource: string | null;
    ddCap: number | null;
    dd: {
      matrixLoaded: boolean;
      category: string;
      gradeBand: string | null;
      matrixRow: string | null;
      matrixAmount: number | null;
      problem: string | null;
      cap: number | null;
      source: "override" | "matrix" | "legacy" | null;
      overrideReason: string | null;
      needsMetCheck: boolean;
    };
    lowIncomeCap: number | null;
    otherStoAll: number;
    otherStoDisabledDisplaced: number;
    esaStatus: string | null;
    sentAllFunds: number;
  };
  limits: { tuitionCeiling: number | null; tuitionReason: string | null; ddCapOverride: number | null; ddCapReason: string | null };
  otherSto: {
    answer: string | null;
    all: number;
    disabledDisplaced: number;
    rows: { id: string; stoName: string; program: string; amount: number; source: string; note: string | null }[];
  };
  esa: {
    status: string | null;
    closedOn: string | null;
    note: string | null;
    source: string | null;
    closureDocumentId: string | null;
    applicationAnswer: string | null;
    closureDocuments: { id: string; fileName: string; uploadedOn: string }[];
  };
  priority: { returning: boolean; sibling: boolean; waitingListSince: string | null; hasNarrative: boolean; pctOfRplLimit: number | null } | null;
  narrative: string | null;
  waitingList: { addedOn: string; note: string | null } | null;
  decisions: DecisionData[];
  awards: AwardRow[];
  recommendations: { date: string; amount: number; campaign: string | null; donor: string }[];
  error?: string;
};

function usd(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

const STATUS_STYLE: Record<string, string> = {
  Awarded: "border-amber-500/50 text-amber-700 dark:text-amber-400",
  Reviewed: "border-sky-500/50 text-sky-700 dark:text-sky-400",
  Approved: "",
  "Sent to school": "",
  "Held: active ESA": "border-amber-500/50 text-amber-700 dark:text-amber-400",
  Reversed: "text-muted-foreground",
};

class NeedsReason extends Error {}

async function post(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => null)) as { error?: string; needsReason?: boolean } | null;
  if (data?.needsReason) throw new NeedsReason(data.error ?? "A reason is needed.");
  if (!res.ok) throw new Error(data?.error ?? "That was not saved.");
}
const policy = (body: Record<string, unknown>) => post("/api/admin/allocation/student-policy", body);

export function StudentAllocationDialog({
  studentId,
  schoolYear,
  ledger,
  openAwardId,
  onClose,
  onChanged,
}: {
  studentId: string;
  schoolYear: string;
  /** An award (or decision) to open on arrival, e.g. from the committee list. */
  openAwardId?: string | null;
  /** Every campaign × fund balance, for moving an award to another campaign. */
  ledger: CampaignFundRow[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pay, setPay] = useState<Record<string, { amount: string; paidAt: string; reference: string; overrideReason: string; warning: string | null }>>({});
  const [ret, setRet] = useState<Record<string, { amount: string; returnedOn: string; note: string }>>({});
  const [tuition, setTuition] = useState({ value: "", reason: "" });
  const [dd, setDd] = useState({ value: "", reason: "" });
  const [esa, setEsa] = useState({ status: "", closedOn: "", closureDocumentId: "", reason: "" });
  const [sto, setSto] = useState({ id: "", stoName: "", program: "unknown", amount: "", note: "" });
  const [moving, setMoving] = useState<Record<string, string>>({});
  const [showNarrative, setShowNarrative] = useState(false);
  const [waitNote, setWaitNote] = useState("");
  const [showReversed, setShowReversed] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/admin/allocation/student?studentId=${encodeURIComponent(studentId)}&year=${encodeURIComponent(schoolYear)}`,
      { cache: "no-store" },
    );
    const data = (await res.json().catch(() => null)) as Detail | null;
    setDetail(data);
    if (data?.limits) {
      setTuition({ value: data.limits.tuitionCeiling != null ? String(data.limits.tuitionCeiling) : "", reason: data.limits.tuitionReason ?? "" });
      setDd({ value: data.limits.ddCapOverride != null ? String(data.limits.ddCapOverride) : "", reason: data.limits.ddCapReason ?? "" });
    }
    if (data?.esa) {
      setEsa({
        status: data.esa.status ?? "",
        closedOn: data.esa.closedOn ?? "",
        closureDocumentId: data.esa.closureDocumentId ?? "",
        reason: "",
      });
    }
  }, [studentId, schoolYear]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(fn: () => Promise<void>, ok: string) {
    setMessage(null);
    try {
      await fn();
      setMessage({ ok: true, text: ok });
      await load();
      onChanged();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "That was not saved." });
    }
  }

  const today = isoDateInArizona(new Date());
  const esaActive = detail?.esa.status === "active";

  // One card per allocation: its campaign lines share a decision record.
  const groups = (() => {
    if (!detail) return [];
    const byKey = new Map<string, AwardRow[]>();
    for (const award of detail.awards) {
      const key = award.decisionId ?? award.allocationGroupId ?? award.id;
      byKey.set(key, [...(byKey.get(key) ?? []), award]);
    }
    return Array.from(byKey, ([key, lines]) => {
      const active = lines.filter((l) => l.status !== "reversed");
      return {
        key,
        lines,
        reversed: active.length === 0,
        fundingLabel: lines[0].fundingLabel,
        total: active.length ? active.reduce((s, l) => s + l.amount, 0) : lines.reduce((s, l) => s + l.amount, 0),
        sent: lines.reduce((s, l) => s + l.sent, 0),
        decision: detail.decisions.find((d) => d.id === lines[0].decisionId) ?? null,
      };
    });
  })();
  const reversedGroups = groups.filter((g) => g.reversed);
  const visibleGroups = showReversed ? groups : groups.filter((g) => !g.reversed);
  const openKey = openAwardId ? groups.find((g) => g.key === openAwardId || g.lines.some((l) => l.id === openAwardId))?.key ?? null : null;

  useEffect(() => {
    if (!openKey) return;
    document.getElementById(`award-${openKey}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [openKey]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">{detail?.student.name ?? "Student"}</DialogTitle>
          <DialogDescription>
            {schoolYear} · {detail?.student.school ?? "School not set"} · {detail?.student.grade ?? "grade not set"}
          </DialogDescription>
        </DialogHeader>

        {!detail ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-6 text-sm">
            <section className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["approvedApplication", "Approved application"],
                    ["overflow", "Overflow"],
                    ["low_income", "Low-income"],
                    ["disabled", "Disabled"],
                    ["displaced", "Displaced"],
                  ] as const
                ).map(([key, label]) => (
                  <Badge key={key} variant={detail.eligibility[key] ? "secondary" : "outline"} className={detail.eligibility[key] ? "" : "text-muted-foreground"}>
                    {detail.eligibility[key] ? "✓" : "✗"} {label}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {detail.priority?.returning ? <Badge variant="outline">Returning student</Badge> : null}
                {detail.priority?.sibling ? <Badge variant="outline">Sibling of a recipient</Badge> : null}
                {detail.waitingList ? <Badge variant="outline">Waiting list since {detail.waitingList.addedOn}</Badge> : null}
                <Badge variant="outline">
                  {detail.priority?.pctOfRplLimit != null ? `${detail.priority.pctOfRplLimit}% of reduced-price lunch limit` : "Income not on file"}
                </Badge>
                {detail.narrative ? (
                  <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => setShowNarrative((v) => !v)}>
                    {showNarrative ? "Hide narrative" : "Read narrative"}
                  </Button>
                ) : null}
              </div>
              {showNarrative && detail.narrative ? (
                <p className="whitespace-pre-wrap rounded-md border border-border/60 bg-muted/30 p-3 text-muted-foreground">{detail.narrative}</p>
              ) : null}
            </section>

            {/* Need assessment: once per student and year */}
            <section className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="font-medium text-foreground">Need assessment · {schoolYear}</p>
              <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Household</dt>
                  <dd>
                    {detail.needAssessment.householdSize != null ? `${detail.needAssessment.householdSize} people` : "Size not on file"} ·{" "}
                    {usd(detail.needAssessment.householdIncome)} income
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reduced-price lunch limit</dt>
                  <dd>{detail.needAssessment.pctOfRplLimit != null ? `${detail.needAssessment.pctOfRplLimit}% of the limit` : "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tuition (after discounts)</dt>
                  <dd>{usd(detail.needAssessment.tuition)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Other aid: other STOs reported</dt>
                  <dd>
                    {usd(detail.needAssessment.otherSto)}
                    {detail.needAssessment.otherStoCount ? ` (${detail.needAssessment.otherStoCount})` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sent by ACTSTO</dt>
                  <dd>{usd(detail.needAssessment.actSent)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tuition room remaining</dt>
                  <dd className="font-medium text-foreground">{usd(detail.needAssessment.tuitionRoom)}</dd>
                </div>
              </dl>
              <p className="text-[11px] text-muted-foreground">From the application&apos;s certified household and the payments recorded. Read-only.</p>
            </section>

            {/* ESA status for the year */}
            <section className={cn("space-y-2 rounded-lg border p-3", esaActive ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20" : "border-border/60")}>
              <p className="font-medium text-foreground">ESA status for {schoolYear}</p>
              <p className="text-xs text-muted-foreground">
                {esaActive
                  ? "Active ESA: awards are allowed, but nothing can be sent to the school until the ESA is closed."
                  : "An active ESA allows the award but blocks payment to the school."}
                {detail.esa.applicationAnswer ? ` The application answered "${detail.esa.applicationAnswer}".` : ""}
                {detail.esa.note ? ` Last note: ${detail.esa.note}` : ""}
              </p>
              <div className="grid gap-2 sm:grid-cols-[10rem_10rem_1fr_auto] sm:items-end">
                <div>
                  <Label className="text-xs">Status</Label>
                  <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2" value={esa.status} onChange={(e) => setEsa({ ...esa, status: e.target.value })}>
                    <option value="">Not recorded</option>
                    {ESA_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Closed on</Label>
                  <Input type="date" className="mt-1" disabled={esa.status !== "closed"} value={esa.closedOn} onChange={(e) => setEsa({ ...esa, closedOn: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Reason for the change</Label>
                  <Input className="mt-1" value={esa.reason} onChange={(e) => setEsa({ ...esa, reason: e.target.value })} placeholder="e.g. ESA closure letter received" />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!esa.status || !esa.reason.trim()}
                  onClick={() =>
                    void act(
                      () => policy({ action: "set_esa", studentId, schoolYear, status: esa.status, closedOn: esa.closedOn, closureDocumentId: esa.closureDocumentId, reason: esa.reason }),
                      "ESA status saved.",
                    )
                  }
                >
                  Save ESA
                </Button>
              </div>
              {esa.status === "closed" ? (
                <div>
                  <Label className="text-xs">ESA closure letter (optional)</Label>
                  {detail.esa.closureDocuments.length ? (
                    <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2" value={esa.closureDocumentId} onChange={(e) => setEsa({ ...esa, closureDocumentId: e.target.value })}>
                      <option value="">None</option>
                      {detail.esa.closureDocuments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fileName} · uploaded {d.uploadedOn}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No ESA closure letter on the application yet. The family uploads it on the application&apos;s ESA step.
                    </p>
                  )}
                </div>
              ) : null}
            </section>

            {/* Limits */}
            <section className="grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
              <div>
                <p className="font-medium text-foreground">Tuition ceiling</p>
                <p className="text-xs text-muted-foreground">
                  {usd(detail.money.tuitionCeiling)}
                  {detail.money.tuitionSource === "application" ? " from the application" : detail.money.tuitionSource === "override" ? " (entered by staff)" : ""}
                  {" · "}other STOs {usd(detail.money.otherStoAll)} · ACTSTO sent {usd(detail.money.sentAllFunds)}
                  {detail.money.tuitionCeiling !== null
                    ? ` · room ${usd(Math.max(0, detail.money.tuitionCeiling - detail.money.otherStoAll - detail.money.sentAllFunds))}`
                    : ""}
                </p>
                <Input className="mt-2" aria-label="Tuition ceiling" placeholder="Override $" value={tuition.value} onChange={(e) => setTuition({ ...tuition, value: e.target.value })} />
                <Input className="mt-2" aria-label="Reason for tuition override" placeholder="Reason" value={tuition.reason} onChange={(e) => setTuition({ ...tuition, reason: e.target.value })} />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() =>
                    void act(
                      () => post("/api/admin/allocation/limits", { studentId, schoolYear, tuitionCeiling: tuition.value || null, tuitionReason: tuition.reason }, "PUT"),
                      "Tuition ceiling saved.",
                    )
                  }
                >
                  Save tuition
                </Button>
              </div>
              <div>
                <p className="font-medium text-foreground">Disabled/displaced cap (all STOs)</p>
                {!detail.money.dd.matrixLoaded ? (
                  <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    Waiting for ADOR {schoolYear} state aid matrix. No disabled/displaced payment can be sent until it&apos;s entered.
                  </p>
                ) : null}
                {detail.money.dd.problem && detail.money.dd.source !== "override" ? (
                  <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    {detail.money.dd.problem} Disabled/displaced payments wait until it&apos;s fixed.
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  Category {spedLabel(detail.money.dd.category)} · {ddBandLabel(detail.money.dd.gradeBand)}
                  {detail.money.dd.matrixRow ? ` · row "${detail.money.dd.matrixRow}"` : ""} · 90% state aid{" "}
                  {usd(detail.money.dd.matrixAmount)} · cap {usd(detail.money.dd.cap)}
                  {detail.money.dd.source === "override" ? ` (override: ${detail.money.dd.overrideReason})` : detail.money.dd.source === "legacy" ? " (typed in before the matrix)" : ""}
                  {" · "}other STOs {usd(detail.money.otherStoDisabledDisplaced)}
                </p>
                {detail.money.dd.needsMetCheck ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Former preschool category: regular education applies from kindergarten. Check whether an updated MET sets a new category.
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">Low-income cap for this grade (ACTSTO only): {usd(detail.money.lowIncomeCap)}.</p>
                <Input className="mt-2" aria-label="Override the disabled/displaced cap" placeholder="Override $ (rare)" value={dd.value} onChange={(e) => setDd({ ...dd, value: e.target.value })} />
                <Input className="mt-2" aria-label="Reason for the override" placeholder="Reason (required, logged)" value={dd.reason} onChange={(e) => setDd({ ...dd, reason: e.target.value })} />
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={!dd.value || !dd.reason.trim()} onClick={() => void act(() => policy({ action: "dd_override", studentId, schoolYear, ddCap: dd.value, reason: dd.reason }), "Cap override saved.")}>
                    Save override
                  </Button>
                  {detail.limits.ddCapOverride !== null ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => void act(() => policy({ action: "dd_override", studentId, schoolYear, ddCap: null }), "Override removed; the matrix cap applies.")}>
                      Remove override
                    </Button>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Other STOs */}
            <section className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="font-medium text-foreground">Scholarships from other STOs this year</p>
              <p className="text-xs text-muted-foreground">
                {detail.otherSto.answer === "yes"
                  ? "The family said yes on the application."
                  : detail.otherSto.answer === "no"
                    ? "The family said no on the application."
                    : "Not answered on the application."}{" "}
                Counted against tuition, and disabled/displaced amounts against the all-STO cap. Self-reported, so staff can correct them.
              </p>
              {detail.otherSto.rows.length ? (
                <ul className="space-y-1">
                  {detail.otherSto.rows.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2">
                      <span>
                        {r.stoName} · {OTHER_STO_PROGRAMS.find((p) => p.value === r.program)?.label ?? r.program} · {usd(r.amount)}
                        <span className="text-xs text-muted-foreground"> ({r.source === "application" ? "family" : "staff"})</span>
                      </span>
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setSto({ id: r.id, stoName: r.stoName, program: r.program, amount: String(r.amount), note: r.note ?? "" })}>
                        Edit
                      </button>
                      <button type="button" className="text-xs text-destructive hover:underline" onClick={() => void act(() => policy({ action: "delete_other_sto", id: r.id }), "Removed.")}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-[1fr_12rem_8rem_auto] sm:items-end">
                <div>
                  <Label className="text-xs">STO name</Label>
                  <Input className="mt-1" value={sto.stoName} onChange={(e) => setSto({ ...sto, stoName: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Program</Label>
                  <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2" value={sto.program} onChange={(e) => setSto({ ...sto, program: e.target.value })}>
                    {OTHER_STO_PROGRAMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Amount $</Label>
                  <Input className="mt-1" inputMode="decimal" value={sto.amount} onChange={(e) => setSto({ ...sto, amount: e.target.value })} />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!sto.stoName.trim() || !sto.amount}
                  onClick={() =>
                    void act(async () => {
                      await policy({ action: "save_other_sto", studentId, schoolYear, ...sto });
                      setSto({ id: "", stoName: "", program: "unknown", amount: "", note: "" });
                    }, "Other STO scholarship saved.")
                  }
                >
                  {sto.id ? "Save" : "Add"}
                </Button>
              </div>
            </section>

            {/* Awards: one card per allocation, with its lines, payments and decision */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-base font-semibold text-primary">Awards</h3>
                {reversedGroups.length ? (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" className="size-4" checked={showReversed} onChange={(e) => setShowReversed(e.target.checked)} />
                    Show reversed ({reversedGroups.length})
                  </label>
                ) : null}
              </div>
              {visibleGroups.length === 0 ? (
                <p className="text-muted-foreground">
                  {groups.length ? `No active awards for ${schoolYear}.` : `No awards for ${schoolYear} yet.`}
                </p>
              ) : (
                visibleGroups.map((group) => {
                  const decision = group.decision;
                  const status = awardCardStatus({
                    reversed: group.reversed,
                    stage: decision?.stage ?? "awarded",
                    awarded: group.total,
                    sent: group.sent,
                    esaActive,
                  });
                  return (
                    <div
                      key={group.key}
                      id={`award-${group.key}`}
                      className={cn("space-y-3 rounded-lg border p-3", group.reversed ? "border-dashed border-border/60 bg-muted/30 opacity-75" : "border-border/60")}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {group.fundingLabel} · {usd(group.total)} · {schoolYear}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Allocated {formatDate(group.lines[0].createdAt)}
                            {group.lines[0].createdByEmail ? ` by ${group.lines[0].createdByEmail}` : ""}
                            {group.lines[0].note ? ` · ${group.lines[0].note}` : ""}
                            {group.lines.length > 1 ? ` · ${group.lines.length} campaign lines` : ""}
                          </p>
                        </div>
                        <Badge variant={status === "Approved" || status === "Sent to school" ? "secondary" : "outline"} className={STATUS_STYLE[status]}>
                          {status}
                        </Badge>
                      </div>

                      {group.lines.map((award) => {
                        const form = pay[award.id] ?? { amount: "", paidAt: today, reference: "", overrideReason: "", warning: null };
                        const notPayable = Math.max(0, award.amount - award.sent - award.payable);
                        return (
                          <div key={award.id} className={cn("space-y-2", group.lines.length > 1 && "rounded-md border border-border/50 p-2")}>
                            {group.lines.length > 1 ? (
                              <p className="text-xs font-medium text-foreground">
                                {usd(award.amount)}
                                {award.status === "reversed" ? " · reversed" : ""}
                              </p>
                            ) : null}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Campaign:</span>
                            {award.campaignKey ? (
                              <span className="font-medium text-foreground">
                                {award.campaignTitle ?? (award.campaignKey === "general" ? "General gifts (no campaign)" : "Campaign")}
                              </span>
                            ) : (
                              <Badge variant="outline" className="border-destructive/40 text-destructive">
                                None. No campaign is credited.
                              </Badge>
                            )}
                          </div>
                          {award.status !== "reversed" ? (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <select
                                aria-label="Move this award to another campaign"
                                className="h-8 min-w-[14rem] rounded-md border border-input bg-background px-2"
                                value={moving[award.id] ?? ""}
                                onChange={(e) => setMoving({ ...moving, [award.id]: e.target.value })}
                              >
                                <option value="">{award.campaignKey ? "Change campaign…" : "Attach a campaign…"}</option>
                                {ledger
                                  .filter((r) => r.fundingSource === award.fundingSource && r.key !== award.campaignKey)
                                  .map((r) => (
                                    <option key={r.key} value={r.key} disabled={r.remaining + 0.005 < award.amount}>
                                      {r.label} ({usd(r.remaining)} left)
                                    </option>
                                  ))}
                              </select>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8"
                                disabled={!moving[award.id]}
                                onClick={() =>
                                  void act(
                                    () => post(`/api/admin/allocation/awards/${award.id}`, { action: "set_campaign", campaignId: moving[award.id] }),
                                    "Campaign saved. Nothing was reversed.",
                                  )
                                }
                              >
                                Save campaign
                              </Button>
                            </div>
                          ) : null}
                          <p className="text-xs tabular-nums text-muted-foreground">
                            At the school {usd(award.sent)} · can still send {usd(award.payable)}
                            {notPayable > 0 && award.status !== "reversed" ? ` · ${usd(notPayable)} awarded, not payable (tuition or cap)` : ""}
                          </p>
                          {award.status === "reversed" ? (
                            <p className="text-xs text-muted-foreground">
                              Reversed {award.reversedAt ?? ""}
                              {award.reversedByEmail ? ` by ${award.reversedByEmail}` : ""}
                              {award.reversalReason ? `: ${award.reversalReason}` : ""}
                            </p>
                          ) : null}
                          {award.payments.length ? (
                            <ul className="space-y-2 text-xs">
                              {award.payments.map((p) => {
                                const r = ret[p.id] ?? { amount: "", returnedOn: today, note: "" };
                                return (
                                  <li key={p.id} className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={p.status === "void" ? "line-through" : ""}>
                                        {usd(p.amount)} sent {p.paidAt}
                                        {p.reference ? ` · ref ${p.reference}` : ""}
                                        {p.returned > 0 ? ` · ${usd(p.returned)} returned by the school` : ""}
                                      </span>
                                      {p.status === "void" ? (
                                        <span className="text-muted-foreground">void: {p.voidReason}</span>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            className="text-destructive underline-offset-2 hover:underline"
                                            onClick={() => {
                                              const reason = window.prompt("Why is this payment being voided?");
                                              if (reason) void act(() => post(`/api/admin/allocation/disbursements/${p.id}`, { action: "void", reason }), "Payment voided.");
                                            }}
                                          >
                                            Void
                                          </button>
                                          <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => setRet({ ...ret, [p.id]: r })}>
                                            Record a return
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    {p.tuitionOverrideReason ? <p className="text-muted-foreground">Sent over tuition with other STOs: {p.tuitionOverrideReason}</p> : null}
                                    {p.returnNote ? <p className="whitespace-pre-wrap text-muted-foreground">{p.returnNote}</p> : null}
                                    {ret[p.id] ? (
                                      <div className="grid gap-2 sm:grid-cols-[7rem_10rem_1fr_auto] sm:items-end">
                                        <Input aria-label="Amount returned" placeholder="$" inputMode="decimal" value={r.amount} onChange={(e) => setRet({ ...ret, [p.id]: { ...r, amount: e.target.value } })} />
                                        <Input type="date" aria-label="Date returned" value={r.returnedOn} onChange={(e) => setRet({ ...ret, [p.id]: { ...r, returnedOn: e.target.value } })} />
                                        <Input aria-label="Why it was returned" placeholder="Prorated refund, excess return…" value={r.note} onChange={(e) => setRet({ ...ret, [p.id]: { ...r, note: e.target.value } })} />
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() =>
                                            void act(async () => {
                                              await policy({ action: "payment_return", paymentId: p.id, amount: Number(r.amount.replace(/[^0-9.]/g, "")), returnedOn: r.returnedOn, note: r.note });
                                              setRet((all) => Object.fromEntries(Object.entries(all).filter(([k]) => k !== p.id)));
                                            }, "Return recorded. The money is back on the award, unsent.")
                                          }
                                        >
                                          Save return
                                        </Button>
                                      </div>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}

                          {award.status === "awarded" ? (
                            <div className="space-y-2">
                              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                                <div>
                                  <Label className="text-xs">Send to school $</Label>
                                  <Input value={form.amount} inputMode="decimal" onChange={(e) => setPay({ ...pay, [award.id]: { ...form, amount: e.target.value, warning: null } })} />
                                </div>
                                <div>
                                  <Label className="text-xs">Date sent</Label>
                                  <Input type="date" value={form.paidAt} onChange={(e) => setPay({ ...pay, [award.id]: { ...form, paidAt: e.target.value } })} />
                                </div>
                                <div>
                                  <Label className="text-xs">Check or reference</Label>
                                  <Input value={form.reference} onChange={(e) => setPay({ ...pay, [award.id]: { ...form, reference: e.target.value } })} />
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    void act(async () => {
                                      try {
                                        await post("/api/admin/allocation/disbursements", {
                                          awardId: award.id,
                                          amount: Number(form.amount.replace(/[^0-9.]/g, "")),
                                          paidAt: form.paidAt,
                                          reference: form.reference,
                                          tuitionOverrideReason: form.overrideReason || null,
                                        });
                                      } catch (e) {
                                        if (e instanceof NeedsReason) {
                                          setPay((all) => ({ ...all, [award.id]: { ...form, warning: e.message } }));
                                          throw new Error("Enter a reason below to send it anyway.");
                                        }
                                        throw e;
                                      }
                                    }, "Recorded as sent to school.")
                                  }
                                >
                                  Mark sent
                                </Button>
                              </div>
                              {form.warning ? (
                                <div className="space-y-1 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                                  <p>{form.warning}</p>
                                  <Input
                                    aria-label="Reason to send over tuition"
                                    placeholder="Why it should go anyway (logged)"
                                    value={form.overrideReason}
                                    onChange={(e) => setPay({ ...pay, [award.id]: { ...form, overrideReason: e.target.value } })}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-2">
                            {award.status !== "reversed" && award.sent > 0 && award.sent + 0.005 < award.amount ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const reason = window.prompt(`Release ${usd(award.amount - award.sent)} back to the campaign for reallocation? Why?`);
                                  if (reason) void act(() => policy({ action: "release_unsent", awardId: award.id, reason }), "Unsent money released to the campaign.");
                                }}
                              >
                                Release unsent
                              </Button>
                            ) : null}
                            {award.status !== "reversed" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={() => {
                                  const reason = window.prompt("Why is this award being reversed?");
                                  if (reason) void act(() => post(`/api/admin/allocation/awards/${award.id}`, { action: "reverse", reason }), "Award reversed.");
                                }}
                              >
                                Reverse
                              </Button>
                            ) : null}
                          </div>
                          </div>
                        );
                      })}

                      {decision && !group.reversed ? (
                        <details className="rounded-md border border-border/50 px-3 py-2" open={decision.stage !== "approved" || group.key === openKey}>
                          <summary className="cursor-pointer text-sm font-medium text-foreground">
                            Decision ·{" "}
                            {decision.stage === "approved"
                              ? "approved as allocated"
                              : decision.stage === "reviewed"
                                ? `reviewed by ${decision.reviewedByName ?? "staff"}, awaiting the committee`
                                : "needs review"}
                          </summary>
                          <AwardDecisionSection key={`${decision.id}-${decision.stage}`} decision={decision} viewerId={detail.viewerId} act={(body, ok) => act(() => policy(body), ok)} />
                        </details>
                      ) : null}
                    </div>
                  );
                })
              )}
            </section>

            <section className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="font-medium text-foreground">Overflow waiting list</p>
              {detail.waitingList ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span>
                    On the list since {detail.waitingList.addedOn}
                    {detail.waitingList.note ? ` · ${detail.waitingList.note}` : ""}
                  </span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => void act(() => policy({ action: "waiting_list_remove", studentId }), "Removed from the waiting list.")}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Input className="max-w-sm" placeholder="Note (optional)" value={waitNote} onChange={(e) => setWaitNote(e.target.value)} />
                  <Button type="button" size="sm" variant="outline" onClick={() => void act(() => policy({ action: "waiting_list_add", studentId, note: waitNote }), "Added to the waiting list.")}>
                    Add to waiting list
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Overflow views list waiting-list students and their siblings first (A.R.S. § 43-1603).</p>
            </section>

            <section className="space-y-2">
              <h3 className="font-heading text-base font-semibold text-primary">Donor recommendations</h3>
              <p className="text-xs text-muted-foreground">Context only, never binding. Staff only: never shown to families, and donors never see awards.</p>
              {detail.recommendations.length === 0 ? (
                <p className="text-muted-foreground">None.</p>
              ) : (
                <ul className="space-y-1">
                  {detail.recommendations.map((r, i) => (
                    <li key={i}>
                      {r.date} · {r.donor} · {usd(r.amount)}
                      {r.campaign ? ` · via ${r.campaign}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {message ? (
              <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
                {message.text}
              </p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
