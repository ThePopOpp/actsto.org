"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, X } from "lucide-react";

import { StudentAllocationDialog } from "@/components/dashboard/admin/allocation/student-allocation-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CampaignContext, CampaignFundRow, PlannedAward, BackfillProposal } from "@/lib/allocation/campaign-funds";
import { GENERAL_POOL, toCents, toDollars } from "@/lib/allocation/funding-plan";
import type { AllocationCandidate, FundBalance } from "@/lib/allocation/server";
import { FUNDING_SOURCE_LABEL, FUNDING_SOURCES, type FundingSource } from "@/lib/funding-sources";
import { cn } from "@/lib/utils";

type Pot = { key: string; title: string; isSchoolLevel: boolean; schoolId: string | null; received: number; remaining: number };
type Payload = {
  balances: FundBalance[];
  years: string[];
  year: string;
  schools: { id: string; name: string }[];
  campaigns: Pot[];
  context: CampaignContext | null;
  candidates: AllocationCandidate[];
  ledger: CampaignFundRow[];
  unattached: { fundingSource: FundingSource; amount: number; count: number }[];
  error?: string;
};

type PreviewLine = { key: string; amount: string };
type PreviewRow = { studentId: string; lines: PreviewLine[]; unfunded: number };

const ALLOCATABLE: FundingSource[] = FUNDING_SOURCES.filter((s) => s !== "corporate_other");

function usd(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
const parseAmount = (raw: string) => Number(raw.replace(/[^0-9.]/g, "")) || 0;

/**
 * Award donated money to students. Every award draws on a campaign's gifts to
 * one fund (or gifts made without a campaign), so the campaign is always
 * known: an admin enters one amount per student and the site funds it from
 * campaigns in order, with a preview to edit before confirming. The server
 * decides everything that matters: eligibility, each campaign's and fund's
 * remaining, and later whether a payment fits under tuition and the caps.
 */
export function AllocationTool() {
  const [source, setSource] = useState<FundingSource>("individual_original");
  const [year, setYear] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [campaignKey, setCampaignKey] = useState("");
  const [includeIneligible, setIncludeIneligible] = useState(false);
  const [noAwardOnly, setNoAwardOnly] = useState(false);
  const [sort, setSort] = useState<"name" | "school" | "awarded">("name");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [note, setNote] = useState("");
  const [results, setResults] = useState<{ name: string; ok: boolean; error?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [openStudent, setOpenStudent] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ source });
    if (year) params.set("year", year);
    if (schoolId) params.set("schoolId", schoolId);
    if (campaignKey) params.set("campaignId", campaignKey);
    if (includeIneligible) params.set("includeIneligible", "1");
    const res = await fetch(`/api/admin/allocation?${params}`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as Payload | null;
    setData(json);
    if (json?.year && !year) setYear(json.year);
    setLoading(false);
  }, [source, year, schoolId, campaignKey, includeIneligible]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount, as elsewhere in admin
    void load();
  }, [load]);

  const fund = data?.balances.find((b) => b.fundingSource === source) ?? null;
  const pots = useMemo(() => data?.campaigns ?? [], [data]);
  const potByKey = useMemo(() => new Map(pots.map((p) => [p.key, p])), [pots]);
  const context = data?.context ?? null;
  const names = useMemo(() => new Map((data?.candidates ?? []).map((c) => [c.studentId, c.name])), [data]);

  const entered = Object.entries(amounts)
    .map(([studentId, raw]) => ({ studentId, amount: parseAmount(raw) }))
    .filter((row) => row.amount > 0);
  const enteredTotal = entered.reduce((s, r) => s + r.amount, 0);

  // The chosen campaign's students go in a section at the top: its own
  // students, or for a school-level campaign every eligible student there.
  const isOwn = useCallback(
    (c: AllocationCandidate) =>
      Boolean(context) &&
      (context!.isSchoolLevel ? Boolean(context!.schoolId) && c.schoolId === context!.schoolId : context!.studentIds.includes(c.studentId)),
    [context],
  );
  const recommendedRow = useCallback(
    (studentId: string) => context?.recommended?.students.find((s) => s.studentId === studentId) ?? null,
    [context],
  );

  const rows = useMemo(() => {
    let list = data?.candidates ?? [];
    if (noAwardOnly) list = list.filter((c) => c.awardedAllFunds === 0);
    const sorted = [...list];
    if (sort === "school") sorted.sort((a, b) => (a.schoolName ?? "").localeCompare(b.schoolName ?? "") || a.name.localeCompare(b.name));
    if (sort === "awarded") sorted.sort((a, b) => a.awardedAllFunds - b.awardedAllFunds);
    return { own: sorted.filter(isOwn), others: sorted.filter((c) => !isOwn(c)) };
  }, [data, noAwardOnly, sort, isOwn]);
  const ownIneligible = context && !context.isSchoolLevel
    ? context.studentIds.filter((id) => !(data?.candidates ?? []).some((c) => c.studentId === id)).length
    : 0;

  // ── Preview arithmetic ──
  const previewTotals = useMemo(() => {
    const byPot = new Map<string, number>();
    for (const row of preview ?? []) {
      for (const line of row.lines) byPot.set(line.key, (byPot.get(line.key) ?? 0) + toCents(parseAmount(line.amount)));
    }
    return byPot;
  }, [preview]);
  const overdrawn = [...previewTotals.entries()].filter(([key, cents]) => cents > toCents(potByKey.get(key)?.remaining ?? 0));
  const previewTotal = toDollars([...previewTotals.values()].reduce((s, v) => s + v, 0));
  const linesMissingCampaign = (preview ?? []).some((r) => r.lines.some((l) => !l.key && parseAmount(l.amount) > 0));

  async function requestPlan(body: Record<string, unknown>) {
    setBusy(true);
    setProblem(null);
    setResults([]);
    const res = await fetch("/api/admin/allocation/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fundingSource: source, ...body }),
    });
    const json = (await res.json().catch(() => null)) as { plan?: PlannedAward[]; error?: string } | null;
    setBusy(false);
    if (!res.ok || !json?.plan) {
      setProblem(json?.error ?? "The preview couldn't be made.");
      return;
    }
    setPreview(
      json.plan.map((p) => ({
        studentId: p.studentId,
        lines: p.lines.map((l) => ({ key: l.key, amount: String(l.amount) })),
        unfunded: p.unfunded,
      })),
    );
  }

  function previewFunding() {
    if (!entered.length) return;
    void requestPlan({ entries: entered, preferCampaignId: campaignKey || null });
  }

  function spreadRemaining() {
    if (!campaignKey) return;
    const ids = Object.entries(picked)
      .filter(([, on]) => on)
      .map(([id]) => id);
    if (!ids.length) {
      setProblem("Tick the students to share this campaign's remaining between.");
      return;
    }
    void requestPlan({ spreadCampaignId: campaignKey, studentIds: ids });
  }

  function patchLine(studentId: string, index: number, patch: Partial<PreviewLine>) {
    setPreview((rows) =>
      (rows ?? []).map((r) =>
        r.studentId === studentId ? { ...r, lines: r.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) } : r,
      ),
    );
  }

  async function confirmAwards() {
    if (!preview?.length || !year) return;
    setBusy(true);
    setResults([]);
    const res = await fetch("/api/admin/allocation/awards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        awards: preview
          .map((row) => ({
            studentId: row.studentId,
            fundingSource: source,
            schoolYear: year,
            note: note || null,
            lines: row.lines.map((l) => ({ key: l.key, amount: parseAmount(l.amount) })).filter((l) => l.key && l.amount > 0),
          }))
          .filter((a) => a.lines.length > 0),
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      results?: { studentId: string; ok: boolean; error?: string }[];
      error?: string;
    } | null;
    if (!res.ok || !json?.results) {
      setResults([{ name: "Allocation", ok: false, error: json?.error ?? "Nothing was saved." }]);
    } else {
      setResults(json.results.map((r) => ({ name: names.get(r.studentId) ?? "Student", ok: r.ok, error: r.error })));
      const done = new Set(json.results.filter((r) => r.ok).map((r) => r.studentId));
      setAmounts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !done.has(id))));
      setPreview((rows) => {
        const left = (rows ?? []).filter((r) => !done.has(r.studentId));
        return left.length ? left : null;
      });
    }
    setBusy(false);
    await load();
  }

  const renderRow = (c: AllocationCandidate, own: boolean) => {
    const rec = own ? recommendedRow(c.studentId) : null;
    const recommendedHere = Boolean(campaignKey) && c.recommendedCampaignIds.includes(campaignKey);
    return (
      <tr key={c.studentId} className={cn("border-b border-border/50", !c.eligible && "bg-muted/30")}>
        <td className="py-2 pr-2">
          <input
            type="checkbox"
            className="size-4"
            aria-label={`Choose ${c.name}`}
            disabled={!c.eligible}
            checked={Boolean(picked[c.studentId])}
            onChange={(e) => setPicked((p) => ({ ...p, [c.studentId]: e.target.checked }))}
          />
        </td>
        <td className="py-2 pr-3 font-medium text-foreground">{c.name}</td>
        <td className="py-2 pr-3 text-muted-foreground">
          {c.schoolName ?? "—"} · {c.grade ?? "no grade"}
        </td>
        {context ? (
          <td className="py-2 pr-3 text-right tabular-nums" title={rec ? `Recommended ${usd(rec.recommended)}, awarded ${usd(rec.awarded)}` : ""}>
            {own && rec ? usd(rec.remaining) : own && context.isSchoolLevel ? "Pool" : "—"}
          </td>
        ) : null}
        <td className="py-2 pr-3 text-right tabular-nums">{usd(c.awardedThisFund)}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{usd(c.awardedAllFunds)}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{usd(c.sentAllFunds)}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{usd(c.tuitionCeiling)}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{usd(c.payableRoomThisFund)}</td>
        <td className="py-2 pr-3">
          <div className="flex flex-wrap gap-1">
            {!c.eligible ? (
              <Badge variant="outline" className="border-destructive/40 text-destructive" title={c.ineligibleReason ?? ""}>
                Not eligible
              </Badge>
            ) : null}
            {own && !context?.isSchoolLevel ? <Badge variant="secondary">On this campaign</Badge> : null}
            {recommendedHere ? <Badge variant="secondary" title="Donor recommendations are not binding">Recommended here</Badge> : null}
            {c.esaHold ? <Badge variant="outline" title="Awards are held until ESA documentation arrives">ESA hold</Badge> : null}
            {c.recommendedBy > 0 && !recommendedHere ? (
              <Badge variant="outline" title="Donor recommendations are not binding">
                Recommended ×{c.recommendedBy}
              </Badge>
            ) : null}
            {c.tuitionCeiling === null ? <Badge variant="outline">No tuition</Badge> : null}
          </div>
          {!c.eligible && c.ineligibleReason ? <p className="mt-1 max-w-xs text-xs text-muted-foreground">{c.ineligibleReason}</p> : null}
        </td>
        <td className="py-2 pr-3">
          <Input
            aria-label={`Award for ${c.name}`}
            inputMode="decimal"
            className="h-9 w-28"
            placeholder="$0"
            disabled={!c.eligible}
            value={amounts[c.studentId] ?? ""}
            onChange={(e) => setAmounts((a) => ({ ...a, [c.studentId]: e.target.value }))}
          />
        </td>
        <td className="py-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpenStudent(c.studentId)}>
            Details
          </Button>
        </td>
      </tr>
    );
  };
  const columnCount = context ? 12 : 11;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Every award draws on a campaign&apos;s gifts, so each one names its campaign. A campaign&apos;s money can go to
          any eligible student; its public progress bar counts only awards to its own students. A donor&apos;s
          recommendation is context, never binding. Tuition and caps are checked when money is sent to the school.
        </AlertDescription>
      </Alert>

      <Card className="border-border/80">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="al-fund">Fund</Label>
            <select
              id="al-fund"
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={source}
              onChange={(e) => {
                setSource(e.target.value as FundingSource);
                setAmounts({});
                setPreview(null);
                setCampaignKey("");
              }}
            >
              {ALLOCATABLE.map((s) => (
                <option key={s} value={s}>
                  {FUNDING_SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="al-year">School year</Label>
            <select
              id="al-year"
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {(data?.years ?? []).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="al-campaign">Campaign</Label>
            <select
              id="al-campaign"
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={campaignKey}
              onChange={(e) => {
                setCampaignKey(e.target.value);
                setPreview(null);
              }}
            >
              <option value="">Fund automatically (no campaign first)</option>
              {pots.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.title} ({usd(c.remaining)} left)
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {campaignKey
                ? "Awards draw from this campaign first, then the student's own and recommended campaigns."
                : "Awards draw from the student's own campaign, then recommended, then their school's, then others with money left."}
            </p>
          </div>
          <div>
            <Label htmlFor="al-school">School</Label>
            <select
              id="al-school"
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">All schools</option>
              {(data?.schools ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4" checked={noAwardOnly} onChange={(e) => setNoAwardOnly(e.target.checked)} />
            Only students with no award yet this year
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4" checked={includeIneligible} onChange={(e) => setIncludeIneligible(e.target.checked)} />
            Also list students who aren&apos;t eligible for this fund (with the reason)
          </label>
        </CardContent>
      </Card>

      <BackfillNotice unattached={data?.unattached ?? []} onDone={() => void load()} />

      <div className={cn("grid gap-4", context ? "sm:grid-cols-5" : "sm:grid-cols-4")}>
        {[
          { label: "Received", value: fund?.received, hint: fund?.needsReview ? `${usd(fund.needsReview)} awaiting funding-source review` : null },
          { label: "Allocated", value: fund?.allocated },
          { label: "Sent to schools", value: fund?.disbursed },
          { label: "Unallocated (fund)", value: fund?.remaining },
          ...(context ? [{ label: `Left in ${context.label}`, value: context.remaining }] : []),
        ].map((card) => (
          <Card key={card.label} className="border-border/80">
            <CardContent className="p-4">
              <p className="truncate text-xs font-semibold uppercase text-muted-foreground" title={card.label}>
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">{usd(card.value ?? 0)}</p>
              {"hint" in card && card.hint ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{card.hint}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/80">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-primary">
              {includeIneligible ? "Students" : "Eligible students"} · {FUNDING_SOURCE_LABEL[source]} · {year || "—"}
            </CardTitle>
            <CardDescription>
              Enter one amount per student, then preview how it is funded from campaigns. Nothing is saved until you
              confirm, and every award is checked again on the server.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="al-sort" className="text-xs text-muted-foreground">
              Sort
            </Label>
            <select
              id="al-sort"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="name">Name</option>
              <option value="school">School</option>
              <option value="awarded">Least awarded first</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.own.length + rows.others.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students match. Students appear here once their application for the school year is approved
              {source === "individual_original" || source === "unrestricted" ? "." : " and they hold the matching eligibility."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-2">
                      <span className="sr-only">Choose</span>
                    </th>
                    <th className="py-2 pr-3">Student</th>
                    <th className="py-2 pr-3">School · grade</th>
                    {context ? (
                      <th className="py-2 pr-3 text-right" title="Gifts recommending the student, split evenly, less awards from this campaign">
                        Recommended remaining
                      </th>
                    ) : null}
                    <th className="py-2 pr-3 text-right">This fund</th>
                    <th className="py-2 pr-3 text-right">All funds</th>
                    <th className="py-2 pr-3 text-right">Sent</th>
                    <th className="py-2 pr-3 text-right">Tuition</th>
                    <th className="py-2 pr-3 text-right" title="What could still be sent from this fund under tuition and caps">
                      Payable room
                    </th>
                    <th className="py-2 pr-3">Notes</th>
                    <th className="py-2 pr-3">Award</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {context ? (
                    <>
                      <tr className="bg-primary/5">
                        <td colSpan={columnCount} className="px-2 py-2 text-xs font-semibold uppercase text-primary">
                          {context.isSchoolLevel
                            ? `Eligible students at ${context.schoolName ?? "the campaign's school"} · campaign pool ${usd(context.remaining)}`
                            : `On ${context.label} · ${usd(context.remaining)} left in this fund`}
                        </td>
                      </tr>
                      {rows.own.map((c) => renderRow(c, true))}
                      {rows.own.length === 0 ? (
                        <tr>
                          <td colSpan={columnCount} className="px-2 py-2 text-sm text-muted-foreground">
                            {context.isSchoolLevel
                              ? "No eligible students at this school for this fund and year."
                              : "None of this campaign's students is eligible for this fund and year."}
                          </td>
                        </tr>
                      ) : null}
                      {context.recommended ? (
                        <tr className="border-b border-border/50 text-muted-foreground">
                          <td />
                          <td className="py-2 pr-3" colSpan={2}>
                            No recommendation
                            <span className="block text-xs">Gifts that named no student, less awards they covered</span>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{usd(context.recommended.noRecommendation)}</td>
                          <td colSpan={columnCount - 4} className="py-2 text-xs">
                            {ownIneligible > 0
                              ? `${ownIneligible} of this campaign's students ${ownIneligible === 1 ? "isn't" : "aren't"} eligible for this fund and year, so ${ownIneligible === 1 ? "isn't" : "aren't"} listed. `
                              : ""}
                            Context only. The campaign&apos;s remaining is the cap on awards.
                          </td>
                        </tr>
                      ) : null}
                      {rows.others.length ? (
                        <tr className="bg-muted/40">
                          <td colSpan={columnCount} className="px-2 py-2 text-xs font-semibold uppercase text-muted-foreground">
                            Other eligible students
                          </td>
                        </tr>
                      ) : null}
                      {rows.others.map((c) => renderRow(c, false))}
                    </>
                  ) : (
                    rows.others.map((c) => renderRow(c, false))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <div className="min-w-[16rem] flex-1">
              <Label htmlFor="al-note">Note on these awards (optional)</Label>
              <Input id="al-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <p className="text-sm tabular-nums">
              Entered: <span className="font-semibold">{usd(enteredTotal)}</span> for {entered.length} student
              {entered.length === 1 ? "" : "s"}
            </p>
            <Button type="button" disabled={busy || !entered.length} onClick={previewFunding}>
              Preview funding
            </Button>
            {campaignKey ? (
              <Button type="button" variant="outline" disabled={busy || !(context && context.remaining > 0)} onClick={spreadRemaining}>
                Allocate all remaining from this campaign
              </Button>
            ) : null}
          </div>
          {campaignKey ? (
            <p className="text-xs text-muted-foreground">
              &ldquo;Allocate all remaining&rdquo; shares what this campaign has left evenly between the students you tick.
            </p>
          ) : null}
          {problem ? (
            <p role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          ) : null}

          {preview ? (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-heading font-semibold text-primary">Preview: how each award is funded</p>
                  <p className="text-xs text-muted-foreground">
                    Change a campaign or an amount, add a campaign, or remove a line. Each award is saved as one line per
                    campaign.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(null)}>
                  Close preview
                </Button>
              </div>
              <ul className="space-y-3">
                {preview.map((row) => {
                  const total = toDollars(row.lines.reduce((s, l) => s + toCents(parseAmount(l.amount)), 0));
                  return (
                    <li key={row.studentId} className="rounded-md border border-border/60 bg-background p-3">
                      <p className="text-sm">
                        <span className="font-medium text-foreground">{names.get(row.studentId) ?? "Student"}</span>{" "}
                        <span className="tabular-nums">{usd(total)}</span>
                        {row.lines.length ? (
                          <span className="text-muted-foreground">
                            {" = "}
                            {row.lines
                              .filter((l) => parseAmount(l.amount) > 0)
                              .map((l) => `${usd(parseAmount(l.amount))} ${potByKey.get(l.key)?.title ?? "(choose a campaign)"}`)
                              .join(" + ")}
                          </span>
                        ) : null}
                      </p>
                      {row.unfunded > 0 ? (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          {usd(row.unfunded)} couldn&apos;t be funded: no campaign has that much left in this fund.
                        </p>
                      ) : null}
                      <div className="mt-2 space-y-2">
                        {row.lines.map((line, i) => (
                          <div key={i} className="flex flex-wrap items-center gap-2">
                            <select
                              aria-label="Campaign"
                              className="h-9 min-w-[14rem] rounded-md border border-input bg-background px-2 text-sm"
                              value={line.key}
                              onChange={(e) => patchLine(row.studentId, i, { key: e.target.value })}
                            >
                              <option value="">Choose a campaign</option>
                              {pots.map((p) => (
                                <option key={p.key} value={p.key}>
                                  {p.title} ({usd(p.remaining)} left)
                                </option>
                              ))}
                            </select>
                            <Input
                              aria-label="Amount from this campaign"
                              inputMode="decimal"
                              className="h-9 w-28"
                              value={line.amount}
                              onChange={(e) => patchLine(row.studentId, i, { amount: e.target.value })}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label="Remove this line"
                              onClick={() =>
                                setPreview((rows) =>
                                  (rows ?? []).map((r) => (r.studentId === row.studentId ? { ...r, lines: r.lines.filter((_, j) => j !== i) } : r)),
                                )
                              }
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPreview((rows) =>
                              (rows ?? []).map((r) => (r.studentId === row.studentId ? { ...r, lines: [...r.lines, { key: "", amount: "" }] } : r)),
                            )
                          }
                        >
                          <Plus className="mr-1 size-3.5" /> Add a campaign
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="space-y-1 text-sm">
                <p className="tabular-nums">
                  Total: <span className="font-semibold">{usd(previewTotal)}</span> · fund unallocated after{" "}
                  <span className={cn("font-semibold", (fund?.remaining ?? 0) - previewTotal < -0.005 && "text-destructive")}>
                    {usd((fund?.remaining ?? 0) - previewTotal)}
                  </span>
                </p>
                {overdrawn.map(([key, cents]) => (
                  <p key={key} className="text-destructive">
                    {potByKey.get(key)?.title ?? "A campaign"}: {usd(toDollars(cents))} planned, only {usd(potByKey.get(key)?.remaining ?? 0)} left.
                  </p>
                ))}
                {linesMissingCampaign ? <p className="text-destructive">Choose the campaign for every line.</p> : null}
              </div>
              <Button
                type="button"
                disabled={busy || previewTotal <= 0 || overdrawn.length > 0 || linesMissingCampaign || previewTotal > (fund?.remaining ?? 0) + 0.005}
                onClick={() => void confirmAwards()}
              >
                {busy ? "Awarding…" : "Confirm awards"}
              </Button>
            </div>
          ) : null}

          {results.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {results.map((r, i) => (
                <li key={`${r.name}-${i}`} className={r.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
                  {r.ok ? `Awarded to ${r.name}.` : `${r.name}: ${r.error}`}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <ReconciliationCard data={data} year={year} />

      {openStudent && year ? (
        <StudentAllocationDialog
          studentId={openStudent}
          schoolYear={year}
          ledger={data?.ledger ?? []}
          onClose={() => setOpenStudent(null)}
          onChanged={() => void load()}
        />
      ) : null}
    </div>
  );
}

/** Older awards with no campaign: review the plan, then attach. */
function BackfillNotice({
  unattached,
  onDone,
}: {
  unattached: { fundingSource: FundingSource; amount: number; count: number }[];
  onDone: () => void;
}) {
  const [proposals, setProposals] = useState<BackfillProposal[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const count = unattached.reduce((s, u) => s + u.count, 0);
  if (count === 0 && !message) return null;

  async function run(apply: boolean) {
    setBusy(true);
    const res = await fetch("/api/admin/allocation/backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apply }),
    });
    const json = (await res.json().catch(() => null)) as { proposals?: BackfillProposal[]; error?: string } | null;
    setBusy(false);
    if (!res.ok || !json?.proposals) {
      setMessage(json?.error ?? "That didn't work.");
      return;
    }
    if (apply) {
      setProposals(null);
      setMessage(`Campaigns attached to ${json.proposals.length} award${json.proposals.length === 1 ? "" : "s"}.`);
      onDone();
    } else {
      setProposals(json.proposals);
    }
  }

  return (
    <Alert className="border-amber-400/60">
      <AlertDescription className="space-y-2">
        {count > 0 ? (
          <p>
            {count} award{count === 1 ? "" : "s"} ({usd(unattached.reduce((s, u) => s + u.amount, 0))}) made before campaigns
            were required {count === 1 ? "names" : "name"} no campaign, so no campaign is credited. Attach a campaign to each
            using the same order as new awards: the student&apos;s own campaign, then recommended, then others with money
            left.
          </p>
        ) : null}
        {message ? <p className="font-medium">{message}</p> : null}
        {count > 0 && !proposals ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void run(false)}>
            {busy ? "Working…" : "Review and attach campaigns"}
          </Button>
        ) : null}
        {proposals ? (
          <div className="space-y-2">
            <ul className="space-y-1 text-sm">
              {proposals.map((p) => (
                <li key={p.awardId}>
                  {p.studentName} · {p.fundLabel} · {usd(p.amount)} →{" "}
                  {p.lines.length ? p.lines.map((l) => `${usd(l.amount)} ${l.label}`).join(" + ") : "no campaign has gifts to this fund"}
                  {p.keptWhole ? " (kept whole: money was already sent)" : ""}
                  {p.uncovered > 0 ? (
                    <span className="text-destructive"> · {usd(p.uncovered)} more than that campaign has left</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={busy} onClick={() => void run(true)}>
                {busy ? "Saving…" : "Attach these campaigns"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setProposals(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

/** Fund totals, and the campaign-by-fund grid that must add up to them. */
function ReconciliationCard({ data, year }: { data: Payload | null; year: string }) {
  const balances = (data?.balances ?? []).filter(
    (b) => b.fundingSource !== "corporate_other" || b.received !== 0 || b.allocated !== 0,
  );
  const ledger = data?.ledger ?? [];
  const unattached = data?.unattached ?? [];

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="font-heading text-primary">Reconciliation</CardTitle>
          <CardDescription>
            Received − awarded = remaining, for every fund and for every campaign within it. Rebuilt from the donation,
            award and payment rows each time. The campaign lines of each fund add up to the fund.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-muted" href="/api/admin/allocation/export?kind=reconciliation">
            <Download className="size-4" /> Funds CSV
          </a>
          <a className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-muted" href="/api/admin/allocation/export?kind=campaigns">
            <Download className="size-4" /> Campaigns CSV
          </a>
          <a
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-muted"
            href={`/api/admin/allocation/export?kind=ledger${year ? `&year=${encodeURIComponent(year)}` : ""}`}
          >
            <Download className="size-4" /> Awards &amp; payments CSV
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Fund</th>
                <th className="py-2 pr-3 text-right">Received</th>
                <th className="py-2 pr-3 text-right">Allocated</th>
                <th className="py-2 pr-3 text-right">Sent</th>
                <th className="py-2 text-right">Unallocated</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.fundingSource} className="border-b border-border/50">
                  <td className="py-2 pr-3">
                    {b.label}
                    {b.fundingSource === "corporate_other" ? (
                      <span className="block text-xs text-muted-foreground">
                        Business gifts made before the corporate form asked for a program. Assign each one to low-income
                        or disabled/displaced on Payments (Funding source, Edit) before awarding it.
                      </span>
                    ) : null}
                    {b.needsReview > 0 ? (
                      <span className="block text-xs text-amber-700 dark:text-amber-400">
                        {usd(b.needsReview)} awaiting funding-source review on Payments
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{usd(b.received)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{usd(b.allocated)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{usd(b.disbursed)}</td>
                  <td className={cn("py-2 text-right tabular-nums", b.remaining < 0 && "text-destructive")}>{usd(b.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto">
          <p className="mb-2 font-heading text-sm font-semibold text-primary">By campaign</p>
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Campaign</th>
                <th className="py-2 pr-3 text-right">Received</th>
                <th className="py-2 pr-3 text-right" title="Awards to the campaign's own students: the public progress bar">
                  Awarded in campaign
                </th>
                <th className="py-2 pr-3 text-right" title="Awards drawn from the campaign to students who aren't on it">
                  Awarded to others
                </th>
                <th className="py-2 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => {
                const rows = ledger.filter((r) => r.fundingSource === b.fundingSource);
                const loose = unattached.find((u) => u.fundingSource === b.fundingSource);
                if (!rows.length && !loose) return null;
                const sum = (pick: (r: CampaignFundRow) => number) => toDollars(rows.reduce((s, r) => s + toCents(pick(r)), 0));
                const received = sum((r) => r.received);
                const awarded = toDollars(toCents(sum((r) => r.awardedInCampaign + r.awardedToOthers)) + toCents(loose?.amount ?? 0));
                const remaining = toDollars(toCents(received) - toCents(awarded));
                const reconciles =
                  toCents(received) === toCents(b.received) &&
                  toCents(awarded) === toCents(b.allocated) &&
                  toCents(remaining) === toCents(b.remaining);
                return (
                  <Fragment key={b.fundingSource}>
                    <tr className="bg-muted/40">
                      <td colSpan={5} className="px-2 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
                        {b.label}
                      </td>
                    </tr>
                    {rows.map((r) => (
                      <tr key={`${r.fundingSource}-${r.key}`} className="border-b border-border/50">
                        <td className="py-2 pr-3">
                          {r.label}
                          {r.key === GENERAL_POOL ? <span className="block text-xs text-muted-foreground">Gifts made without a campaign</span> : null}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{usd(r.received)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{usd(r.awardedInCampaign)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{usd(r.awardedToOthers)}</td>
                        <td className={cn("py-2 text-right tabular-nums", r.remaining < 0 && "text-destructive")}>{usd(r.remaining)}</td>
                      </tr>
                    ))}
                    {loose ? (
                      <tr className="border-b border-border/50 text-amber-700 dark:text-amber-400">
                        <td className="py-2 pr-3">No campaign yet ({loose.count} award{loose.count === 1 ? "" : "s"})</td>
                        <td className="py-2 pr-3 text-right tabular-nums">—</td>
                        <td className="py-2 pr-3 text-right tabular-nums">—</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{usd(loose.amount)}</td>
                        <td className="py-2 text-right tabular-nums">−{usd(loose.amount)}</td>
                      </tr>
                    ) : null}
                    <tr className="border-b border-border font-medium">
                      <td className="py-2 pr-3">
                        Total {reconciles ? <span className="text-emerald-700 dark:text-emerald-400">· matches the fund</span> : <span className="text-destructive">· does not match the fund</span>}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{usd(received)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums" colSpan={2}>
                        {usd(awarded)} awarded
                      </td>
                      <td className="py-2 text-right tabular-nums">{usd(remaining)}</td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
