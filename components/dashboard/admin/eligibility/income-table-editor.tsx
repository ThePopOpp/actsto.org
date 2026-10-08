"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { validateIncomeTable, type IncomeTable } from "@/lib/eligibility/income-table";

type SavedTable = IncomeTable & { updatedAt: string; updatedByEmail: string | null };

const SIZES = [1, 2, 3, 4, 5, 6, 7, 8];

function blank(schoolYear: string): IncomeTable {
  return {
    schoolYear,
    rows: SIZES.map((householdSize) => ({ householdSize, base185: 0, maxIncome: 0 })),
    additionalBase: 0,
    additionalMax: 0,
    sourceNote: "",
  };
}

function num(value: string) {
  return Number(value.replace(/[^0-9.]/g, "")) || 0;
}

/**
 * The low-income table per school year. The same ×1.85 and per-member checks
 * the server applies run as you type, so a typo shows before it is saved.
 */
export function IncomeTableEditor() {
  const [tables, setTables] = useState<SavedTable[]>([]);
  const [draft, setDraft] = useState<IncomeTable | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/income-tables", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { tables?: SavedTable[] } | null;
    const list = data?.tables ?? [];
    setTables(list);
    setDraft((current) => current ?? (list[0] ? { ...list[0] } : blank("")));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount, as elsewhere in admin
    void load();
  }, []);

  const problems = useMemo(() => (draft ? validateIncomeTable(draft) : []), [draft]);

  function patchRow(size: number, key: "base185" | "maxIncome", value: number) {
    setDraft((d) =>
      d ? { ...d, rows: d.rows.map((r) => (r.householdSize === size ? { ...r, [key]: value } : r)) } : d,
    );
  }

  function fillFromBase() {
    setDraft((d) =>
      d
        ? {
            ...d,
            rows: d.rows.map((r) => ({ ...r, maxIncome: Math.round(r.base185 * 1.85) })),
            additionalMax: Math.round(d.additionalBase * 1.85),
          }
        : d,
    );
  }

  async function save() {
    if (!draft) return;
    setStatus(null);
    setError(null);
    const res = await fetch("/api/admin/income-tables", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "The table was not saved.");
      return;
    }
    setStatus(`Saved ${draft.schoolYear}.`);
    await load();
  }

  if (!draft) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit border-border/80">
        <CardHeader>
          <CardTitle className="text-base text-primary">School years</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tables.map((t) => (
            <button
              key={t.schoolYear}
              type="button"
              onClick={() => setDraft({ ...t })}
              className={
                draft.schoolYear === t.schoolYear
                  ? "block w-full rounded-md bg-primary/10 px-3 py-2 text-left text-sm font-medium text-primary"
                  : "block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              }
            >
              {t.schoolYear}
              <span className="block text-xs text-muted-foreground">
                Updated {t.updatedAt.slice(0, 10)}
                {t.updatedByEmail ? ` by ${t.updatedByEmail}` : ""}
              </span>
            </button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const latest = tables[0];
              const next = latest ? Number(latest.schoolYear.slice(0, 4)) + 1 : new Date().getFullYear();
              setDraft(blank(`${next}/${next + 1}`));
            }}
          >
            Add a school year
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Table for {draft.schoolYear || "a new year"}</CardTitle>
          <CardDescription>
            The qualifying limit is the right-hand column: 185% of the reduced-price lunch figure. Verify each year
            against ADOR guidance (A.R.S. § 43-1504) before saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="max-w-xs">
            <Label htmlFor="it-year">School year</Label>
            <Input
              id="it-year"
              className="mt-1.5"
              placeholder="2027/2028"
              value={draft.schoolYear}
              onChange={(e) => setDraft({ ...draft, schoolYear: e.target.value.trim() })}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Household size</th>
                  <th className="py-2 pr-3">185% of poverty level (reduced-lunch base)</th>
                  <th className="py-2">Maximum income for the low-income scholarship</th>
                </tr>
              </thead>
              <tbody>
                {draft.rows
                  .slice()
                  .sort((a, b) => a.householdSize - b.householdSize)
                  .map((row) => (
                    <tr key={row.householdSize} className="border-b border-border/50">
                      <td className="py-2 pr-3 tabular-nums">{row.householdSize}</td>
                      <td className="py-2 pr-3">
                        <Input
                          inputMode="numeric"
                          aria-label={`Base for household of ${row.householdSize}`}
                          value={row.base185 ? String(row.base185) : ""}
                          onChange={(e) => patchRow(row.householdSize, "base185", num(e.target.value))}
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          inputMode="numeric"
                          aria-label={`Maximum for household of ${row.householdSize}`}
                          value={row.maxIncome ? String(row.maxIncome) : ""}
                          onChange={(e) => patchRow(row.householdSize, "maxIncome", num(e.target.value))}
                        />
                      </td>
                    </tr>
                  ))}
                <tr>
                  <td className="py-2 pr-3">Each additional member</td>
                  <td className="py-2 pr-3">
                    <Input
                      inputMode="numeric"
                      aria-label="Base increment per additional member"
                      value={draft.additionalBase ? String(draft.additionalBase) : ""}
                      onChange={(e) => setDraft({ ...draft, additionalBase: num(e.target.value) })}
                    />
                  </td>
                  <td className="py-2">
                    <Input
                      inputMode="numeric"
                      aria-label="Maximum increment per additional member"
                      value={draft.additionalMax ? String(draft.additionalMax) : ""}
                      onChange={(e) => setDraft({ ...draft, additionalMax: num(e.target.value) })}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={fillFromBase}>
            Fill the right column from the left (× 1.85)
          </Button>
          <div>
            <Label htmlFor="it-note">Source and notes</Label>
            <Textarea
              id="it-note"
              className="mt-1.5"
              value={draft.sourceNote ?? ""}
              onChange={(e) => setDraft({ ...draft, sourceNote: e.target.value })}
            />
          </div>
          {problems.length > 0 ? (
            <ul className="space-y-1 rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Every row checks out.</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void save()} disabled={problems.length > 0}>
              Save table
            </Button>
            {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
            {error ? (
              <span role="alert" className="text-sm text-destructive">
                {error}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
