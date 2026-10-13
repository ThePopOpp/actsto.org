"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FUNDING_SOURCE_LABEL, FUNDING_SOURCES, type FundingSource } from "@/lib/funding-sources";
import { GRADE_BAND_LABEL, type GradeBand } from "@/lib/grades";
import { formatDate } from "@/lib/format-date";

type Cap = {
  id: string;
  fundingSource: FundingSource;
  schoolYear: string;
  gradeBand: GradeBand;
  amount: number;
  updatedAt: string;
  updatedByEmail: string | null;
};

type HistoryRow = { at: string; action: string; before: unknown; after: unknown };

function usd(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

function describe(value: unknown) {
  if (!value || typeof value !== "object") return "—";
  const v = value as Record<string, unknown>;
  const amount = typeof v.amount === "number" ? usd(v.amount) : "";
  return [v.schoolYear, v.gradeBand === "9_12" ? "9-12" : v.gradeBand === "k8" ? "K-8" : "", amount, v._actorEmail ? `by ${v._actorEmail}` : ""]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Per-student limits on money sent to the school, by fund, school year and
 * grade band. Awards are not capped; only disbursements are checked against
 * these. Every change is kept in the history below.
 */
export function CapsEditor() {
  const [caps, setCaps] = useState<Cap[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [form, setForm] = useState<{ fundingSource: FundingSource; schoolYear: string; gradeBand: GradeBand; amount: string }>({
    fundingSource: "corporate_low_income",
    schoolYear: "",
    gradeBand: "k8",
    amount: "",
  });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/scholarship-caps", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { caps?: Cap[]; history?: HistoryRow[] } | null;
    setCaps(data?.caps ?? []);
    setHistory(data?.history ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount, as elsewhere in admin
    void load();
  }, []);

  async function save(body: { fundingSource: string; schoolYear: string; gradeBand: string; amount: number }) {
    setMessage(null);
    const res = await fetch("/api/admin/scholarship-caps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setMessage({ ok: false, text: data?.error ?? "The cap was not saved." });
      return;
    }
    setMessage({ ok: true, text: "Saved." });
    await load();
  }

  const years = Array.from(new Set(caps.map((c) => c.schoolYear)));

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Caps by school year</CardTitle>
          <CardDescription>
            Low-income caps are per STO (counting only our payments). Disabled/displaced limits differ per student and are
            entered on each student&apos;s allocation record, not here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {years.length === 0 ? (
            <p className="text-sm text-muted-foreground">No caps entered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">School year</th>
                    <th className="py-2 pr-3">Fund</th>
                    <th className="py-2 pr-3">Grade band</th>
                    <th className="py-2 pr-3 text-right">Cap</th>
                    <th className="py-2">Last changed</th>
                  </tr>
                </thead>
                <tbody>
                  {caps.map((cap) => (
                    <tr key={cap.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 tabular-nums">{cap.schoolYear}</td>
                      <td className="py-2 pr-3">{FUNDING_SOURCE_LABEL[cap.fundingSource] ?? cap.fundingSource}</td>
                      <td className="py-2 pr-3">{GRADE_BAND_LABEL[cap.gradeBand]}</td>
                      <td className="py-2 pr-3 text-right font-medium tabular-nums">{usd(cap.amount)}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {formatDate(cap.updatedAt)}
                        {cap.updatedByEmail ? ` · ${cap.updatedByEmail}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Add or change a cap</CardTitle>
          <CardDescription>Saving an existing fund, year and band replaces its amount; the old amount stays in the history.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save({ ...form, amount: Number(form.amount.replace(/[^0-9.]/g, "")) });
            }}
          >
            <div>
              <Label htmlFor="cap-fund">Fund</Label>
              <select
                id="cap-fund"
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.fundingSource}
                onChange={(e) => setForm({ ...form, fundingSource: e.target.value as FundingSource })}
              >
                {FUNDING_SOURCES.filter((s) => s !== "corporate_other" && s !== "unrestricted").map((s) => (
                  <option key={s} value={s}>
                    {FUNDING_SOURCE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="cap-year">School year</Label>
              <Input
                id="cap-year"
                className="mt-1.5"
                placeholder="2027/2028"
                value={form.schoolYear}
                onChange={(e) => setForm({ ...form, schoolYear: e.target.value.trim() })}
              />
            </div>
            <div>
              <Label htmlFor="cap-band">Grade band</Label>
              <select
                id="cap-band"
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.gradeBand}
                onChange={(e) => setForm({ ...form, gradeBand: e.target.value as GradeBand })}
              >
                <option value="k8">{GRADE_BAND_LABEL.k8}</option>
                <option value="9_12">{GRADE_BAND_LABEL["9_12"]}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="cap-amount">Cap ($)</Label>
              <Input
                id="cap-amount"
                className="mt-1.5"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-4">
              <Button type="submit">Save cap</Button>
              {message ? (
                <span role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
                  {message.text}
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Change history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.at + h.action} className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="tabular-nums text-muted-foreground">{h.at.slice(0, 16).replace("T", " ")}</span>
                  <span>{h.action === "scholarship_cap.create" ? "Added" : "Changed"}</span>
                  {h.before ? <span className="text-muted-foreground">from {describe(h.before)}</span> : null}
                  <span>to {describe(h.after)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
