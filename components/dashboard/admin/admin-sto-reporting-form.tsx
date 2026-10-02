"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emptyProgramFigures,
  percentOf,
  STO_PROGRAMS,
  type StoProgramFigures,
  type StoProgramKey,
  type StoReportingYear,
} from "@/lib/sto-reporting";

type SaveState = "loading" | "idle" | "saving" | "saved" | "error";

function amountValue(value: string) {
  return Number.parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
}

export function AdminStoReportingForm() {
  const [years, setYears] = useState<StoReportingYear[]>([]);
  const [state, setState] = useState<SaveState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/sto-reporting", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { years?: StoReportingYear[]; error?: string } | null;
        if (!mounted) return;
        if (!res.ok || !data?.years) {
          setState("error");
          setMessage(data?.error ?? "Could not load reporting figures.");
          return;
        }
        setYears(data.years);
        setState("idle");
      })
      .catch(() => {
        if (mounted) {
          setState("error");
          setMessage("Could not load reporting figures.");
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  function touch() {
    setState((s) => (s === "loading" ? s : "idle"));
    setMessage("");
  }

  function patchYear(index: number, patch: Partial<StoReportingYear>) {
    setYears((current) => current.map((y, i) => (i === index ? { ...y, ...patch } : y)));
    touch();
  }

  function patchProgram(index: number, key: StoProgramKey, patch: Partial<StoProgramFigures>) {
    setYears((current) =>
      current.map((y, i) =>
        i === index ? { ...y, programs: { ...y.programs, [key]: { ...y.programs[key], ...patch } } } : y,
      ),
    );
    touch();
  }

  function addYear() {
    // The report covers the prior fiscal year, so a first entry defaults to last year.
    const newest = years.map((y) => Number(y.fiscalYear)).sort((a, b) => b - a)[0];
    const fiscalYear = String(newest ? newest + 1 : new Date().getFullYear() - 1);
    setYears((current) => [
      { fiscalYear, periodLabel: "", published: false, programs: emptyProgramFigures() },
      ...current,
    ]);
    touch();
  }

  function removeYear(index: number) {
    if (!window.confirm(`Remove fiscal year ${years[index].fiscalYear}? It will disappear from the public page when you save.`)) return;
    setYears((current) => current.filter((_, i) => i !== index));
    touch();
  }

  async function save() {
    setState("saving");
    setMessage("");
    const res = await fetch("/api/admin/sto-reporting", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ years }),
    });
    const data = (await res.json().catch(() => null)) as { years?: StoReportingYear[]; error?: string } | null;
    if (!res.ok || !data?.years) {
      setState("error");
      setMessage(data?.error ?? "Could not save reporting figures.");
      return;
    }
    setYears(data.years);
    setState("saved");
    setMessage("Saved. Published years are live on the public scholarship reporting page.");
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="font-heading text-primary">Website reporting requirement</CardTitle>
            <CardDescription className="max-w-3xl">
              A.R.S. § 43-1503(B)(6) and § 43-1603(B)(5): for the prior fiscal year, publish for each scholarship
              program the dollar amount and percent of scholarships awarded to students with family income up to 185%
              of the poverty level, and above 185% but not more than 342.25%. Update by September 30 each year.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/scholarship-reporting"
              target="_blank"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-primary hover:bg-muted/40"
            >
              Public page <ExternalLink className="size-3.5" />
            </Link>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addYear} disabled={state === "loading"}>
              <Plus className="size-4" />
              Add fiscal year
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {state === "loading" ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {state !== "loading" && years.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No fiscal years entered yet. Add the prior fiscal year to publish the required figures.
          </p>
        ) : null}

        {years.map((year, index) => (
          <section key={index} className="space-y-4 rounded-lg border border-border/80 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-28">
                <Label htmlFor={`fy-${index}`}>Fiscal year</Label>
                <Input
                  id={`fy-${index}`}
                  className="mt-1.5"
                  inputMode="numeric"
                  maxLength={4}
                  value={year.fiscalYear}
                  onChange={(e) => patchYear(index, { fiscalYear: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                />
              </div>
              <div className="min-w-56 flex-1">
                <Label htmlFor={`fy-period-${index}`}>Period</Label>
                <Input
                  id={`fy-period-${index}`}
                  className="mt-1.5"
                  placeholder="January 1 – December 31, 2025"
                  value={year.periodLabel}
                  onChange={(e) => patchYear(index, { periodLabel: e.target.value })}
                />
              </div>
              <label className="flex h-9 items-center gap-2 text-sm">
                <Checkbox checked={year.published} onCheckedChange={(v) => patchYear(index, { published: v === true })} />
                Published on the website
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground"
                onClick={() => removeYear(index)}
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Program</th>
                    <th className="py-2 pr-3">Offered</th>
                    <th className="py-2 pr-3">Total awarded ($)</th>
                    <th className="py-2 pr-3">Up to 185% ($)</th>
                    <th className="py-2 pr-3">185% – 342.25% ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {STO_PROGRAMS.map((p) => {
                    const f = year.programs[p.key];
                    const over = f.offered && f.upTo185 + f.from185To342 > f.totalAwarded + 0.001;
                    return (
                      <tr key={p.key} className="align-top">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-foreground">{p.label}</p>
                          <p className="text-xs text-muted-foreground">{p.statute}</p>
                          {over ? (
                            <p className="mt-1 text-xs text-destructive">Brackets exceed the total awarded.</p>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3">
                          <label className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                            <Checkbox
                              checked={f.offered}
                              onCheckedChange={(v) => patchProgram(index, p.key, { offered: v === true })}
                            />
                            {f.offered ? "Yes" : "N/A"}
                          </label>
                        </td>
                        {(["totalAwarded", "upTo185", "from185To342"] as const).map((field) => (
                          <td key={field} className="py-2.5 pr-3">
                            <Input
                              aria-label={`${p.label} ${field}`}
                              inputMode="decimal"
                              disabled={!f.offered}
                              value={f[field]}
                              onChange={(e) => patchProgram(index, p.key, { [field]: amountValue(e.target.value) })}
                            />
                            {field !== "totalAwarded" && f.offered ? (
                              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                                {percentOf(f[field], f.totalAwarded)}% of total
                              </p>
                            ) : null}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button type="button" onClick={() => void save()} disabled={state === "loading" || state === "saving"}>
            {state === "saving" ? "Saving…" : "Save reporting figures"}
          </Button>
          {message ? (
            <p className={state === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
