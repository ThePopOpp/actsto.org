"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

import { StudentAllocationDialog } from "@/components/dashboard/admin/allocation/student-allocation-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AllocationCandidate, FundBalance } from "@/lib/allocation/server";
import { FUNDING_SOURCE_LABEL, FUNDING_SOURCES, type FundingSource } from "@/lib/funding-sources";
import { cn } from "@/lib/utils";

type CampaignOption = { id: string; title: string; isSchoolLevel: boolean; remaining: number };
type Payload = {
  balances: FundBalance[];
  years: string[];
  year: string;
  schools: { id: string; name: string }[];
  campaigns: CampaignOption[];
  candidates: AllocationCandidate[];
  error?: string;
};

const ALLOCATABLE: FundingSource[] = FUNDING_SOURCES.filter((s) => s !== "corporate_other");

function usd(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Award donated money to students (spec #5). The server decides everything
 * that matters: who is eligible for restricted money, whether the fund or
 * campaign has the money, and later whether a payment to a school fits under
 * tuition and the caps. This screen shows those rules and their answers.
 */
export function AllocationTool() {
  const [source, setSource] = useState<FundingSource>("individual_original");
  const [year, setYear] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [includeIneligible, setIncludeIneligible] = useState(false);
  const [noAwardOnly, setNoAwardOnly] = useState(false);
  const [sort, setSort] = useState<"name" | "school" | "awarded">("name");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [results, setResults] = useState<{ name: string; ok: boolean; error?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [openStudent, setOpenStudent] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ source });
    if (year) params.set("year", year);
    if (schoolId) params.set("schoolId", schoolId);
    if (campaignId) params.set("campaignId", campaignId);
    if (includeIneligible) params.set("includeIneligible", "1");
    const res = await fetch(`/api/admin/allocation?${params}`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as Payload | null;
    setData(json);
    if (json?.year && !year) setYear(json.year);
    setLoading(false);
  }, [source, year, schoolId, campaignId, includeIneligible]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount, as elsewhere in admin
    void load();
  }, [load]);

  const fund = data?.balances.find((b) => b.fundingSource === source) ?? null;
  const campaign = data?.campaigns.find((c) => c.id === campaignId) ?? null;
  const entered = Object.entries(amounts)
    .map(([studentId, raw]) => ({ studentId, amount: Number(raw.replace(/[^0-9.]/g, "")) || 0 }))
    .filter((row) => row.amount > 0);
  const enteredTotal = entered.reduce((s, r) => s + r.amount, 0);
  const available = campaign ? Math.min(campaign.remaining, fund?.remaining ?? 0) : fund?.remaining ?? 0;

  const rows = useMemo(() => {
    let list = data?.candidates ?? [];
    if (noAwardOnly) list = list.filter((c) => c.awardedAllFunds === 0);
    const sorted = [...list];
    if (sort === "school") sorted.sort((a, b) => (a.schoolName ?? "").localeCompare(b.schoolName ?? "") || a.name.localeCompare(b.name));
    if (sort === "awarded") sorted.sort((a, b) => a.awardedAllFunds - b.awardedAllFunds);
    return sorted;
  }, [data, noAwardOnly, sort]);

  async function confirmAwards() {
    if (!entered.length || !year) return;
    setBusy(true);
    setResults([]);
    const res = await fetch("/api/admin/allocation/awards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        awards: entered.map((row) => ({
          studentId: row.studentId,
          fundingSource: source,
          schoolYear: year,
          amount: row.amount,
          campaignId: campaignId || null,
          note: note || null,
        })),
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      results?: { studentId: string; ok: boolean; error?: string }[];
      error?: string;
    } | null;
    const names = new Map((data?.candidates ?? []).map((c) => [c.studentId, c.name]));
    if (!res.ok || !json?.results) {
      setResults([{ name: "Allocation", ok: false, error: json?.error ?? "Nothing was saved." }]);
    } else {
      setResults(json.results.map((r) => ({ name: names.get(r.studentId) ?? "Student", ok: r.ok, error: r.error })));
      setAmounts((current) => {
        const next = { ...current };
        for (const r of json.results ?? []) if (r.ok) delete next[r.studentId];
        return next;
      });
    }
    setBusy(false);
    await load();
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          A donor&apos;s recommendation is never binding. It is shown as context only; awards follow eligibility and
          ACT&apos;s own decisions. Awards themselves are not capped. Caps and tuition are checked when money is sent to
          the school.
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
            <Label htmlFor="al-campaign">Draw from campaign (optional)</Label>
            <select
              id="al-campaign"
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">Any gifts to this fund</option>
              {(data?.campaigns ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({usd(c.remaining)} unallocated)
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="al-school">School</Label>
            <select
              id="al-school"
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              disabled={Boolean(campaign?.isSchoolLevel)}
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
            <input
              type="checkbox"
              className="size-4"
              checked={includeIneligible}
              onChange={(e) => setIncludeIneligible(e.target.checked)}
            />
            Also list students who aren&apos;t eligible for this fund (with the reason)
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Received", value: fund?.received, hint: fund?.needsReview ? `${usd(fund.needsReview)} awaiting funding-source review` : null },
          { label: "Allocated", value: fund?.allocated },
          { label: "Sent to schools", value: fund?.disbursed },
          { label: campaign ? "Unallocated (this campaign)" : "Unallocated", value: available },
        ].map((card) => (
          <Card key={card.label} className="border-border/80">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">{usd(card.value ?? 0)}</p>
              {card.hint ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{card.hint}</p> : null}
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
              Enter an amount for each student to award, then confirm. Each award is checked again on the server.
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
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students match. Students appear here once their application for the school year is approved
              {source === "individual_original" || source === "unrestricted" ? "." : " and they hold the matching eligibility."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Student</th>
                    <th className="py-2 pr-3">School · grade</th>
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
                  {rows.map((c) => (
                    <tr key={c.studentId} className={cn("border-b border-border/50", !c.eligible && "bg-muted/30")}>
                      <td className="py-2 pr-3 font-medium text-foreground">{c.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {c.schoolName ?? "—"} · {c.grade ?? "no grade"}
                      </td>
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
                          {c.esaHold ? <Badge variant="outline" title="Awards are held until ESA documentation arrives">ESA hold</Badge> : null}
                          {c.recommendedBy > 0 ? (
                            <Badge variant="secondary" title="Donor recommendations are not binding">
                              Recommended ×{c.recommendedBy}
                            </Badge>
                          ) : null}
                          {c.tuitionCeiling === null ? <Badge variant="outline">No tuition</Badge> : null}
                        </div>
                        {!c.eligible && c.ineligibleReason ? (
                          <p className="mt-1 max-w-xs text-xs text-muted-foreground">{c.ineligibleReason}</p>
                        ) : null}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <div className="min-w-[16rem] flex-1">
              <Label htmlFor="al-note">Note on these awards (optional)</Label>
              <Input id="al-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="text-sm">
              <p className="tabular-nums">
                Entered: <span className="font-semibold">{usd(enteredTotal)}</span> for {entered.length} student
                {entered.length === 1 ? "" : "s"}
              </p>
              <p className={cn("tabular-nums", enteredTotal > available ? "text-destructive" : "text-muted-foreground")}>
                Remaining after: {usd(available - enteredTotal)}
              </p>
            </div>
            <Button type="button" disabled={busy || !entered.length || enteredTotal > available} onClick={() => void confirmAwards()}>
              {busy ? "Awarding…" : "Confirm awards"}
            </Button>
          </div>
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

      <Card className="border-border/80">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-primary">Reconciliation</CardTitle>
            <CardDescription>
              Received − allocated = unallocated, for every fund. Rebuilt from the donation, award and payment rows each
              time, never from stored totals.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-muted"
              href="/api/admin/allocation/export?kind=reconciliation"
            >
              <Download className="size-4" /> Reconciliation CSV
            </a>
            <a
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-muted"
              href={`/api/admin/allocation/export?kind=ledger${year ? `&year=${encodeURIComponent(year)}` : ""}`}
            >
              <Download className="size-4" /> Awards &amp; payments CSV
            </a>
          </div>
        </CardHeader>
        <CardContent>
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
                {(data?.balances ?? [])
                  // "Unassigned program" only holds business gifts recorded
                  // before the corporate form asked for a program. Once they
                  // are assigned it is empty, and is hidden.
                  .filter((b) => b.fundingSource !== "corporate_other" || b.received !== 0 || b.allocated !== 0)
                  .map((b) => (
                  <tr key={b.fundingSource} className="border-b border-border/50">
                    <td className="py-2 pr-3">
                      {b.label}
                      {b.fundingSource === "corporate_other" ? (
                        <span className="block text-xs text-muted-foreground">
                          Business gifts made before the corporate form asked for a program. Assign each one to
                          low-income or disabled/displaced on Payments (Funding source, Edit) before awarding it.
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
        </CardContent>
      </Card>

      {openStudent && year ? (
        <StudentAllocationDialog
          studentId={openStudent}
          schoolYear={year}
          onClose={() => setOpenStudent(null)}
          onChanged={() => void load()}
        />
      ) : null}
    </div>
  );
}
