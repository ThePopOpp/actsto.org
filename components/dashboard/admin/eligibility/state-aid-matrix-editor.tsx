"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REGULAR_EDUCATION, SPED_CATEGORIES } from "@/lib/award-policy/disability";
import { DD_GRADE_BANDS } from "@/lib/award-policy/limits";
import { formatDateTime } from "@/lib/format-date";

type Row = { spedCategory: string; gradeBand: string; amount90pct: string };
type History = { id: string; action: string; actorEmail: string | null; note: string | null; createdAt: string; before: number; after: number };

function schoolYearsAround(now = new Date()) {
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return [start + 1, start, start - 1].map((y) => `${y}/${y + 1}`);
}

/**
 * Enter or import ADOR's 90%-of-state-aid matrix for a school year. Saving
 * replaces the year's rows and keeps the old ones in the history; amounts typed
 * per student before the matrix existed are then cleared for that year.
 */
export function StateAidMatrixEditor() {
  const [years, setYears] = useState<string[]>([]);
  const [year, setYear] = useState(schoolYearsAround()[1]);
  const [rows, setRows] = useState<Row[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [note, setNote] = useState("");
  const [csv, setCsv] = useState<{ name: string; text: string } | null>(null);
  const [preview, setPreview] = useState<{ rows: Row[]; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/state-aid-matrix?year=${encodeURIComponent(year)}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      years?: string[];
      rows?: { spedCategory: string; gradeBand: string; amount90pct: number }[];
      history?: History[];
    } | null;
    setYears(data?.years ?? []);
    setRows((data?.rows ?? []).map((r) => ({ ...r, amount90pct: String(r.amount90pct) })));
    setHistory(data?.history ?? []);
  }, [year]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount, as elsewhere in admin
    void load();
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/state-aid-matrix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, note, ...body }),
    });
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      preview?: { spedCategory: string; gradeBand: string; amount90pct: number }[];
      errors?: string[];
      saved?: boolean;
      replacedLegacyCaps?: number;
    } | null;
    setBusy(false);
    return { res, data };
  }

  async function save() {
    const { res, data } = await post({ rows });
    if (!res.ok) return setMessage({ ok: false, text: data?.error ?? "Not saved." });
    setMessage({
      ok: true,
      text: `Saved ${year}.${data?.replacedLegacyCaps ? ` ${data.replacedLegacyCaps} cap(s) typed in before the matrix now come from it.` : ""}`,
    });
    setNote("");
    await load();
  }

  async function importCsv(apply: boolean) {
    if (!csv) return;
    const { res, data } = await post({ csv: csv.text, dryRun: !apply });
    if (!res.ok) return setMessage({ ok: false, text: data?.error ?? "Not imported." });
    const parsed = { rows: (data?.preview ?? []).map((r) => ({ ...r, amount90pct: String(r.amount90pct) })), errors: data?.errors ?? [] };
    if (apply && data?.saved) {
      setPreview(null);
      setCsv(null);
      setNote("");
      setMessage({ ok: true, text: `Imported ${parsed.rows.length} rows for ${year}.` });
      await load();
    } else {
      setPreview(parsed);
    }
  }

  const categoryOptions = Array.from(new Set([...SPED_CATEGORIES.map((c) => c.code), ...rows.map((r) => r.spedCategory)].filter(Boolean)));
  const labelOf = (code: string) => SPED_CATEGORIES.find((c) => c.code === code)?.label ?? code;
  const hasRegular = rows.some((r) => r.spedCategory === REGULAR_EDUCATION);

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-primary">{year}</CardTitle>
            <CardDescription>
              {rows.length ? `${rows.length} rows entered.` : "No matrix for this year yet. Disabled/displaced payments for this year are blocked."}{" "}
              Years entered: {years.length ? years.join(", ") : "none"}.
            </CardDescription>
          </div>
          <div>
            <Label htmlFor="matrix-year" className="text-xs">School year</Label>
            <select id="matrix-year" className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm" value={year} onChange={(e) => setYear(e.target.value)}>
              {Array.from(new Set([...schoolYearsAround(), ...years])).sort().reverse().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!hasRegular && rows.length ? (
            <p className="text-amber-700 dark:text-amber-400">
              Add the regular education ({REGULAR_EDUCATION}) rows: displaced students, 504 plans and former preschoolers use them.
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Grade band</th>
                  <th className="py-2 pr-3">90% of state aid</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 pr-3">
                      <select
                        aria-label="Category"
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                        value={row.spedCategory}
                        onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, spedCategory: e.target.value } : r)))}
                      >
                        <option value="">Choose…</option>
                        {categoryOptions.map((c) => (
                          <option key={c} value={c}>
                            {labelOf(c)} ({c})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-3">
                      <select
                        aria-label="Grade band"
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                        value={row.gradeBand}
                        onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, gradeBand: e.target.value } : r)))}
                      >
                        <option value="">Choose…</option>
                        {DD_GRADE_BANDS.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-3">
                      <Input aria-label="Amount" inputMode="decimal" value={row.amount90pct} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, amount90pct: e.target.value } : r)))} />
                    </td>
                    <td className="py-1.5">
                      <Button type="button" size="sm" variant="ghost" aria-label="Remove row" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                        <X className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setRows([...rows, { spedCategory: "", gradeBand: "", amount90pct: "" }])}>
              <Plus className="mr-1 size-3.5" /> Add a row
            </Button>
            <div className="min-w-[16rem] flex-1">
              <Label htmlFor="matrix-note" className="text-xs">Note for the history (optional)</Label>
              <Input id="matrix-note" className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. ADOR release of June 2027" />
            </div>
            <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
              {busy ? "Saving…" : `Save ${year}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Import ADOR&apos;s spreadsheet</CardTitle>
          <CardDescription>
            Save ADOR&apos;s matrix as CSV with columns sped_category, grade_band (preschool, k8 or 9_12) and amount_90pct.
            You&apos;ll see the rows before anything replaces {year}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setCsv({ name: file.name, text: await file.text() });
              setPreview(null);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              Choose CSV file
            </Button>
            {csv ? <span className="text-muted-foreground">{csv.name}</span> : null}
            {csv && !preview ? (
              <Button type="button" size="sm" disabled={busy} onClick={() => void importCsv(false)}>
                Preview
              </Button>
            ) : null}
          </div>
          {preview ? (
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="font-medium text-foreground">{preview.rows.length} rows read{preview.errors.length ? `, ${preview.errors.length} with problems` : ""}</p>
              {preview.errors.length ? (
                <ul className="text-xs text-destructive">
                  {preview.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              ) : null}
              <ul className="max-h-48 overflow-y-auto text-xs text-muted-foreground">
                {preview.rows.map((r) => (
                  <li key={`${r.spedCategory}-${r.gradeBand}`}>
                    {labelOf(r.spedCategory)} ({r.spedCategory}) · {r.gradeBand} · ${Number(r.amount90pct).toLocaleString()}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={busy || preview.errors.length > 0 || preview.rows.length === 0} onClick={() => void importCsv(true)}>
                  Replace {year} with these rows
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-sm text-destructive"}>
          {message.text}
        </p>
      ) : null}

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Change history · {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {history.map((h) => (
                <li key={h.id} className="text-muted-foreground">
                  {formatDateTime(h.createdAt)} · {h.action === "import" ? "Imported" : "Saved"} by {h.actorEmail ?? "staff"} · {h.before} → {h.after} rows
                  {h.note ? ` · ${h.note}` : ""}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
