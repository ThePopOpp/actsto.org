"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DD_GRADE_BANDS, type CellChange, type DdGradeBand, type MatrixRow } from "@/lib/award-policy/limits";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type UiRow = { rowLabel: string; codes: string; isRegularEducation: boolean; amounts: Record<DdGradeBand, string> };
type CapChange = { studentId: string; name: string; before: number | null; after: number | null; problem: string | null };
type History = {
  id: string;
  action: string;
  actorEmail: string | null;
  note: string | null;
  fileName: string | null;
  createdAt: string;
  before: number;
  after: number;
  capChanges: CapChange[];
};
type Check = { errors: string[]; warnings: string[]; changes: CellChange[]; priorYear: string | null };
type FileData = { name: string; mimeType: string; base64: string };

const toUi = (r: MatrixRow): UiRow => ({
  rowLabel: r.rowLabel,
  codes: r.codes.join(", "),
  isRegularEducation: r.isRegularEducation,
  amounts: Object.fromEntries(DD_GRADE_BANDS.map((b) => [b.value, r.amounts[b.value] === null ? "" : String(r.amounts[b.value])])) as Record<DdGradeBand, string>,
});
const toBody = (r: UiRow) => ({ rowLabel: r.rowLabel, codes: r.codes, isRegularEducation: r.isRegularEducation, amounts: r.amounts });
const blankRow = (): UiRow => ({ rowLabel: "", codes: "", isRegularEducation: false, amounts: { preschool: "", k: "", "1_3": "", "4_8": "", "9_12": "" } });

function schoolYearsAround(now = new Date()) {
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return [start + 1, start, start - 1].map((y) => `${y}/${y + 1}`);
}
const usd = (n: number | null) => (n === null ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`);

/** The matrix as ADOR prints it: one row per category label, one column per grade band. */
function MatrixTable({ rows, onChange, changes }: { rows: UiRow[]; onChange: (rows: UiRow[]) => void; changes: CellChange[] }) {
  const set = (i: number, patch: Partial<UiRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const changeAt = (label: string, band: DdGradeBand) => changes.find((c) => c.rowLabel === label && c.band === band);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="py-2 pr-2">Special education category (as ADOR prints it)</th>
            <th className="py-2 pr-2">Codes it covers</th>
            {DD_GRADE_BANDS.map((b) => (
              <th key={b.value} className="py-2 pr-2">
                {b.label}
              </th>
            ))}
            <th className="py-2 pr-2" title="Displaced students and 504 plans">Reg. ed.</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 align-top">
              <td className="py-1.5 pr-2">
                <Input aria-label="Category label" value={row.rowLabel} onChange={(e) => set(i, { rowLabel: e.target.value })} />
              </td>
              <td className="py-1.5 pr-2">
                <Input
                  aria-label="Codes, separated by commas"
                  value={row.isRegularEducation ? "REG" : row.codes}
                  disabled={row.isRegularEducation}
                  onChange={(e) => set(i, { codes: e.target.value })}
                />
              </td>
              {DD_GRADE_BANDS.map((b) => {
                const change = changeAt(row.rowLabel, b.value);
                return (
                  <td key={b.value} className="py-1.5 pr-2">
                    <Input
                      aria-label={`${row.rowLabel} ${b.label}`}
                      inputMode="decimal"
                      placeholder="no rate"
                      className={cn("w-28 tabular-nums", change?.flagged && "border-amber-500 bg-amber-50 dark:bg-amber-950/30")}
                      value={row.amounts[b.value]}
                      onChange={(e) => set(i, { amounts: { ...row.amounts, [b.value]: e.target.value } })}
                    />
                    {change ? (
                      <p className={cn("mt-0.5 text-[11px]", change.flagged ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                        was {usd(change.before)}
                        {change.pct !== null ? ` (${change.pct > 0 ? "+" : ""}${change.pct}%)` : ""}
                      </p>
                    ) : null}
                  </td>
                );
              })}
              <td className="py-1.5 pr-2 text-center">
                <input type="checkbox" className="mt-2 size-4" aria-label="Regular Education row" checked={row.isRegularEducation} onChange={(e) => set(i, { isRegularEducation: e.target.checked })} />
              </td>
              <td className="py-1.5">
                <Button type="button" size="sm" variant="ghost" aria-label="Remove row" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                  <X className="size-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckList({ check, acknowledged, onAcknowledge }: { check: Check | null; acknowledged: boolean; onAcknowledge: (v: boolean) => void }) {
  if (!check) return null;
  const flagged = check.changes.filter((c) => c.flagged);
  return (
    <div className="space-y-2 text-xs">
      {check.errors.length ? (
        <ul className="space-y-0.5 text-destructive">
          {check.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      {check.warnings.length ? (
        <div className="space-y-1 rounded-md bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <ul className="space-y-0.5">
            {check.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <label className="flex items-center gap-1.5 font-medium">
            <input type="checkbox" className="size-4" checked={acknowledged} onChange={(e) => onAcknowledge(e.target.checked)} />
            I&apos;ve checked these codes
          </label>
        </div>
      ) : null}
      {check.priorYear ? (
        <p className="text-muted-foreground">
          Compared with {check.priorYear}: {check.changes.length} cell(s) changed
          {flagged.length ? `, ${flagged.length} by more than 15% (highlighted) for a second look` : ""}.
        </p>
      ) : (
        <p className="text-muted-foreground">No earlier year to compare with.</p>
      )}
    </div>
  );
}

/**
 * ADOR's 90%-of-state-aid matrix per school year, in ADOR's own layout. Import
 * the file as published (CSV or XLSX), confirm the codes each row covers, and
 * save the whole year at once. Every version is kept with its file, and saving
 * lists the students whose cap changed.
 */
export function StateAidMatrixEditor() {
  const [years, setYears] = useState<string[]>([]);
  const [year, setYear] = useState(schoolYearsAround()[1]);
  const [rows, setRows] = useState<UiRow[]>([]);
  const [check, setCheck] = useState<Check | null>(null);
  const [ack, setAck] = useState(false);
  const [history, setHistory] = useState<History[]>([]);
  const [note, setNote] = useState("");
  const [imported, setImported] = useState<{ file: FileData; year: string; suggestedYear: string | null; rows: UiRow[]; check: Check } | null>(null);
  const [importAck, setImportAck] = useState(false);
  const [capChanges, setCapChanges] = useState<CapChange[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/state-aid-matrix?year=${encodeURIComponent(year)}`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { years?: string[]; rows?: MatrixRow[]; history?: History[] } | null;
    setYears(data?.years ?? []);
    setRows((data?.rows ?? []).map(toUi));
    setHistory(data?.history ?? []);
    setCheck(null);
    setAck(false);
  }, [year]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount, as elsewhere in admin
    void load();
  }, [load]);

  async function postJson(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/admin/state-aid-matrix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as (Check & { error?: string; capChanges?: CapChange[]; replacedLegacyCaps?: number; needsAcknowledgment?: boolean }) | null;
    setBusy(false);
    return { res, data };
  }

  function savedMessage(target: string, data: { capChanges?: CapChange[]; replacedLegacyCaps?: number } | null) {
    setCapChanges(data?.capChanges ?? []);
    setMessage({
      ok: true,
      text: `Saved ${target}. ${data?.capChanges?.length ? `${data.capChanges.length} student cap(s) changed (listed below).` : "No student's cap changed."}${data?.replacedLegacyCaps ? ` ${data.replacedLegacyCaps} cap(s) typed in before the matrix now come from it.` : ""}`,
    });
  }

  async function checkRows() {
    setMessage(null);
    const { data } = await postJson({ year, rows: rows.map(toBody), dryRun: true });
    if (data) setCheck({ errors: data.errors ?? [], warnings: data.warnings ?? [], changes: data.changes ?? [], priorYear: data.priorYear ?? null });
  }

  async function save() {
    setMessage(null);
    const { res, data } = await postJson({ year, rows: rows.map(toBody), note, action: "save", acknowledgeWarnings: ack });
    if (data?.errors) setCheck({ errors: data.errors, warnings: data.warnings ?? [], changes: data.changes ?? [], priorYear: data.priorYear ?? null });
    if (!res.ok) return setMessage({ ok: false, text: data?.error ?? "Not saved." });
    savedMessage(year, data);
    setNote("");
    await load();
  }

  async function readFile(file: File, forYear?: string) {
    setMessage(null);
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    if (forYear) form.set("year", forYear);
    const res = await fetch("/api/admin/state-aid-matrix", { method: "POST", body: form });
    const data = (await res.json().catch(() => null)) as (Check & { error?: string; rows?: MatrixRow[]; year?: string; suggestedYear?: string | null; file?: FileData }) | null;
    setBusy(false);
    if (!res.ok || !data?.file) return setMessage({ ok: false, text: data?.error ?? "That file couldn't be read." });
    setImportAck(false);
    setImported({
      file: data.file,
      year: data.year || year,
      suggestedYear: data.suggestedYear ?? null,
      rows: (data.rows ?? []).map(toUi),
      check: { errors: data.errors ?? [], warnings: data.warnings ?? [], changes: data.changes ?? [], priorYear: data.priorYear ?? null },
    });
  }

  async function recheckImport(next: { year: string; rows: UiRow[] }) {
    if (!imported) return;
    const { data } = await postJson({ year: next.year, rows: next.rows.map(toBody), dryRun: true });
    setImported({ ...imported, ...next, check: { errors: data?.errors ?? [], warnings: data?.warnings ?? [], changes: data?.changes ?? [], priorYear: data?.priorYear ?? null } });
  }

  async function saveImport() {
    if (!imported) return;
    setMessage(null);
    const { res, data } = await postJson({
      year: imported.year,
      rows: imported.rows.map(toBody),
      note,
      action: "import",
      acknowledgeWarnings: importAck,
      file: imported.file,
    });
    if (!res.ok) {
      if (data?.errors) setImported({ ...imported, check: { errors: data.errors, warnings: data.warnings ?? [], changes: data.changes ?? [], priorYear: data.priorYear ?? null } });
      return setMessage({ ok: false, text: data?.error ?? "Not imported." });
    }
    savedMessage(`${imported.year} from ${imported.file.name}`, data);
    setNote("");
    if (imported.year !== year) setYear(imported.year);
    setImported(null);
    await load();
  }

  const yearOptions = Array.from(new Set([...schoolYearsAround(), ...years, ...(imported ? [imported.year] : [])])).sort().reverse();

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Import ADOR&apos;s matrix</CardTitle>
          <CardDescription>
            Upload the file exactly as ADOR publishes it (CSV or XLSX): one row per special education category, columns Preschool,
            Kindergarten, 1st - 3rd, 4th - 8th and 9th - 12th. You&apos;ll confirm the school year and the codes each row covers before
            anything changes. Saving replaces that whole year, keeps the old version and the file in the history, and recalculates
            every disabled/displaced cap.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void readFile(file);
            }}
          />
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy && !imported ? "Reading…" : "Choose ADOR's file"}
          </Button>
          {imported ? (
            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              <div className="flex flex-wrap items-end gap-3">
                <p className="font-medium text-foreground">{imported.file.name}</p>
                <div>
                  <Label htmlFor="import-year" className="text-xs">School year (confirm)</Label>
                  <select
                    id="import-year"
                    className="mt-1 block h-9 rounded-md border border-input bg-background px-2"
                    value={imported.year}
                    onChange={(e) => void recheckImport({ year: e.target.value, rows: imported.rows })}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                        {y === imported.suggestedYear ? " (from the file name)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Check the codes for each row. A row like &quot;MD, A, SID - SC&quot; is split on its commas; change the codes if they mean
                something else (for example the self-contained versions). The codes you set are remembered for next year&apos;s file. Blank
                cells mean no rate for that grade band.
              </p>
              <MatrixTable rows={imported.rows} changes={imported.check.changes} onChange={(next) => setImported({ ...imported, rows: next })} />
              <CheckList check={imported.check} acknowledged={importAck} onAcknowledge={setImportAck} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void recheckImport({ year: imported.year, rows: imported.rows })}>
                  Check again
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || imported.check.errors.length > 0 || (imported.check.warnings.length > 0 && !importAck)}
                  onClick={() => void saveImport()}
                >
                  Replace {imported.year} with this file
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setImported(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-primary">{year}</CardTitle>
            <CardDescription>
              {rows.length ? `${rows.length} rows.` : "No matrix for this year yet. Disabled/displaced payments for this year are blocked."} Years
              entered: {years.length ? years.join(", ") : "none"}. Displaced students and 504 plans use the Regular Education row.
            </CardDescription>
          </div>
          <div>
            <Label htmlFor="matrix-year" className="text-xs">School year</Label>
            <select id="matrix-year" className="mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm" value={year} onChange={(e) => setYear(e.target.value)}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <MatrixTable rows={rows} changes={check?.changes ?? []} onChange={(next) => { setRows(next); setCheck(null); }} />
          <CheckList check={check} acknowledged={ack} onAcknowledge={setAck} />
          <div className="flex flex-wrap items-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setRows([...rows, blankRow()])}>
              <Plus className="mr-1 size-3.5" /> Add a row
            </Button>
            <div className="min-w-[16rem] flex-1">
              <Label htmlFor="matrix-note" className="text-xs">Note for the history (optional)</Label>
              <Input id="matrix-note" className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. ADOR release of June 2027" />
            </div>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void checkRows()}>
              Check
            </Button>
            <Button type="button" size="sm" disabled={busy || Boolean(check?.errors.length) || (Boolean(check?.warnings.length) && !ack)} onClick={() => void save()}>
              {busy ? "Saving…" : `Save ${year}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-sm text-destructive"}>
          {message.text}
        </p>
      ) : null}

      {capChanges && capChanges.length ? (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-primary">Caps that changed</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {capChanges.map((c) => (
                <li key={c.studentId}>
                  {c.name}: {usd(c.before)} → {usd(c.after)}
                  {c.problem ? <span className="text-amber-700 dark:text-amber-400"> · {c.problem}</span> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
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
                  {h.capChanges.length ? ` · ${h.capChanges.length} cap(s) changed` : ""}
                  {h.note ? ` · ${h.note}` : ""}
                  {h.fileName ? (
                    <a className="ml-1 inline-flex items-center gap-1 text-primary hover:underline" href={`/api/admin/state-aid-matrix?file=${h.id}`}>
                      <Download className="size-3.5" />
                      {h.fileName}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
