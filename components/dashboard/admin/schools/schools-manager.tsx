"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { CampaignImageUpload } from "@/components/campaigns/campaign-form-panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminSchool, TypedSchoolName } from "@/app/api/admin/schools/route";
import { schoolCsvTemplate } from "@/lib/schools/csv-template";
import type { SchoolImportResult } from "@/lib/schools/import-types";

const STATUS_LABEL: Record<string, string> = {
  active: "On the list",
  pending: "Waiting for review",
  inactive: "Hidden",
  archived: "Merged / archived",
};

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => null)) as { error?: string; matched?: number } | null;
  if (!res.ok) throw new Error(data?.error ?? "Not saved.");
  return data;
}

/**
 * One school list with ids. Staff approve schools families typed, merge
 * duplicates ("Valley Christian" / "Valley Christian School" / "… — Tempe"),
 * keep each school's address and details correct, and link applications whose
 * family typed a school name under "Other".
 */
export function SchoolsManager() {
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [typed, setTyped] = useState<TypedSchoolName[]>([]);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [query, setQuery] = useState("");
  /** The school being edited, or "new" while adding one. */
  const [editing, setEditing] = useState<AdminSchool | "new" | null>(null);
  const [merging, setMerging] = useState<AdminSchool | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/schools", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { schools?: AdminSchool[]; typedNames?: TypedSchoolName[] } | null;
    setSchools(data?.schools ?? []);
    setTyped(data?.typedNames ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount, as elsewhere in admin
    void load();
  }, [load]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setMessage(null);
    try {
      await fn();
      setMessage({ ok: true, text: ok });
      await load();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Not saved." });
    }
  }

  const listed = useMemo(() => schools.filter((s) => s.status !== "archived"), [schools]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schools
      .filter((s) => (filter === "open" ? s.status !== "archived" : true))
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q));
  }, [schools, filter, query]);
  const pendingCount = schools.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-6">
      {pendingCount > 0 ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
          {pendingCount} school{pendingCount === 1 ? "" : "s"} typed by families {pendingCount === 1 ? "is" : "are"} waiting for
          review. Approve each one, or merge it into the school it duplicates.
        </p>
      ) : null}

      <Card className="border-border/80">
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-primary">Schools</CardTitle>
            <CardDescription>Only schools &ldquo;On the list&rdquo; appear in campaign and donation pickers.</CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button type="button" size="sm" onClick={() => setEditing("new")}>
              Add school
            </Button>
            <Input aria-label="Search schools" placeholder="Search" className="h-9 w-44" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select
              aria-label="Show"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as "open" | "all")}
            >
              <option value="open">Current schools</option>
              <option value="all">Include merged</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">School</th>
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Students</th>
                  <th className="py-2 pr-3 text-right">Campaigns</th>
                  <th className="py-2 pr-3 text-right">Applications</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 align-top">
                    <td className="py-2 pr-3">
                      <span className="font-medium text-foreground">{s.name}</span>
                      {s.isPartner ? <Badge variant="secondary" className="ml-2">Partner</Badge> : null}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {[s.addressLine1, [s.city, [s.state, s.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant={s.status === "active" ? "secondary" : "outline"}>{STATUS_LABEL[s.status] ?? s.status}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <CountLink href={`/dashboard/admin/scholarships/eligibility?school=${s.id}`} count={s.counts.students} label={`Students at ${s.name}`} />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.counts.campaigns}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {/* Every application, drafts included, so the list matches this count. */}
                      <CountLink href={`/dashboard/admin/scholarships?status=all&school=${s.id}`} count={s.counts.applications} label={`Applications for ${s.name}`} />
                    </td>
                    <td className="py-2">
                      {s.status !== "archived" ? (
                        <div className="flex flex-wrap gap-1">
                          {s.status === "pending" ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void run(() => send(`/api/admin/schools/${s.id}`, "PATCH", { status: "active" }), `${s.name} is on the list.`)}
                            >
                              Approve
                            </Button>
                          ) : null}
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(s)}>
                            Edit
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setMerging(s)}>
                            Merge…
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ImportSchoolsCard onImported={load} />

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">School names typed on applications</CardTitle>
          <CardDescription>
            Families who picked &ldquo;Other&rdquo; typed these. Link each to a school on the list so the application
            counts toward it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {typed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every application is linked to a school.</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {typed.map((t) => (
                <TypedRow
                  key={t.name}
                  row={t}
                  schools={listed}
                  onMatch={(schoolId) =>
                    run(() => send("/api/admin/schools/match-typed", "POST", { name: t.name, schoolId }), `Linked “${t.name}”.`)
                  }
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-sm text-destructive"}>
          {message.text}
        </p>
      ) : null}

      {editing ? (
        <SchoolDialog
          school={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(patch) =>
            run(async () => {
              if (editing === "new") await send("/api/admin/schools", "POST", patch);
              else await send(`/api/admin/schools/${editing.id}`, "PATCH", patch);
              setEditing(null);
            }, editing === "new" ? "School added." : "School saved.")
          }
        />
      ) : null}

      {merging ? (
        <MergeDialog
          school={merging}
          schools={listed.filter((s) => s.id !== merging.id)}
          onClose={() => setMerging(null)}
          onMerge={(intoId) =>
            run(async () => {
              await send(`/api/admin/schools/${merging.id}/merge`, "POST", { intoId });
              setMerging(null);
            }, `${merging.name} merged.`)
          }
        />
      ) : null}
    </div>
  );
}

function TypedRow({
  row,
  schools,
  onMatch,
}: {
  row: TypedSchoolName;
  schools: AdminSchool[];
  onMatch: (schoolId: string) => Promise<void>;
}) {
  const guess = schools.find((s) => s.name.toLowerCase().startsWith(row.name.toLowerCase().split(/[—,-]/)[0].trim()))?.id ?? "";
  const [schoolId, setSchoolId] = useState(guess);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2">
      <span>
        <span className="font-medium text-foreground">&ldquo;{row.name}&rdquo;</span>{" "}
        <span className="text-muted-foreground">
          · {row.applications} application{row.applications === 1 ? "" : "s"}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <select
          aria-label={`School for ${row.name}`}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
        >
          <option value="">Choose…</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" disabled={!schoolId} onClick={() => void onMatch(schoolId)}>
          Link
        </Button>
      </span>
    </li>
  );
}

function CountLink({ href, count, label }: { href: string; count: number; label: string }) {
  if (count === 0) return <>0</>;
  return (
    <Link href={href} aria-label={`${label}: ${count}`} className="text-primary underline-offset-4 hover:underline">
      {count}
    </Link>
  );
}

/** Add a school, or edit one: address, contact details, logo, featured image and gallery. */
function SchoolDialog({
  school,
  onClose,
  onSave,
}: {
  school: AdminSchool | null;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: school?.name ?? "",
    schoolType: school?.schoolType ?? "",
    addressLine1: school?.addressLine1 ?? "",
    addressLine2: school?.addressLine2 ?? "",
    city: school?.city ?? "",
    state: school?.state || "AZ",
    zip: school?.zip ?? "",
    website: school?.website ?? "",
    phone: school?.phone ?? "",
    email: school?.email ?? "",
    logoUrl: school?.logoUrl ?? "",
    featuredImageUrl: school?.featuredImageUrl ?? "",
    galleryUrls: school?.galleryUrls ?? [],
    description: school?.description ?? "",
    isPartner: school?.isPartner ?? false,
    status: school?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);
  type TextKey = Exclude<keyof typeof form, "galleryUrls" | "isPartner">;
  const field = (key: TextKey, label: string, cls = "", type = "text") => (
    <div className={cls}>
      <Label htmlFor={`sch-${key}`}>{label}</Label>
      <Input
        id={`sch-${key}`}
        type={type}
        className="mt-1.5"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">{school ? "Edit school" : "Add a school"}</DialogTitle>
          <DialogDescription>Shown on campaign pages and used for allocation and reporting.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("name", "Name", "sm:col-span-2")}
          {field("schoolType", "School type (e.g. K-8, K-12)")}
          <div>
            <Label htmlFor="sch-status">Status</Label>
            <select
              id="sch-status"
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">On the list</option>
              <option value="pending">Waiting for review</option>
              <option value="inactive">Hidden</option>
            </select>
          </div>
          {field("addressLine1", "Street address", "sm:col-span-2")}
          {field("addressLine2", "Address line 2", "sm:col-span-2")}
          {field("city", "City")}
          <div className="grid grid-cols-2 gap-3">
            {field("state", "State")}
            {field("zip", "ZIP")}
          </div>
          {field("phone", "Phone", "", "tel")}
          {field("email", "Email", "", "email")}
          {field("website", "Website", "sm:col-span-2", "url")}
          <div className="sm:col-span-2">
            <Label htmlFor="sch-description">Description</Label>
            <Textarea
              id="sch-description"
              className="mt-1.5 min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Logo</Label>
            <CampaignImageUpload
              label="Click or drop the school logo"
              value={form.logoUrl}
              onClear={() => setForm((f) => ({ ...f, logoUrl: "" }))}
              onUploaded={([url]) => url && setForm((f) => ({ ...f, logoUrl: url }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Featured image</Label>
            <CampaignImageUpload
              label="Click or drop a photo of the school"
              value={form.featuredImageUrl}
              onClear={() => setForm((f) => ({ ...f, featuredImageUrl: "" }))}
              onUploaded={([url]) => url && setForm((f) => ({ ...f, featuredImageUrl: url }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Photo gallery</Label>
            <CampaignImageUpload
              multiple
              label="Click or drop school photos"
              values={form.galleryUrls}
              onClear={(url) => setForm((f) => ({ ...f, galleryUrls: f.galleryUrls.filter((u) => u !== url) }))}
              onUploaded={(urls) => setForm((f) => ({ ...f, galleryUrls: Array.from(new Set([...f.galleryUrls, ...urls])) }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="size-4"
              checked={form.isPartner}
              onChange={(e) => setForm({ ...form, isPartner: e.target.checked })}
            />
            Partner school
          </label>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Put the street on the street line and the city in City; the page builds the full address from both.
          </p>
          <div className="sm:col-span-2">
            <Button
              type="button"
              disabled={saving || !form.name.trim()}
              onClick={async () => {
                setSaving(true);
                await onSave(form);
                setSaving(false);
              }}
            >
              {saving ? "Saving…" : school ? "Save school" : "Add school"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Bulk add or update schools from a CSV. It always previews first: the server
 * reports what each row would do, and nothing is written until Import.
 */
function ImportSchoolsCard({ onImported }: { onImported: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<SchoolImportResult | null>(null);
  const [done, setDone] = useState<SchoolImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(dryRun: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/schools/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, dryRun }),
      });
      const data = (await res.json().catch(() => null)) as (SchoolImportResult & { error?: string }) | null;
      if (!res.ok || !data) throw new Error(data?.error ?? "The file couldn't be read.");
      if (dryRun) {
        setPreview(data);
      } else {
        setDone(data);
        setPreview(null);
        await onImported();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The file couldn't be read.");
    }
    setBusy(false);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([schoolCsvTemplate()], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "act-schools-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const shown = done ?? preview;
  const toWrite = preview ? preview.created + preview.updated : 0;
  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-primary">Import schools</CardTitle>
        <CardDescription>
          Add many schools at once from a CSV, or update ones already listed (matched by name; blank cells leave the
          existing value alone). Logos and photos are image links; separate gallery links with &ldquo;|&rdquo;.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setFileName(file.name);
              setCsv(await file.text());
              setPreview(null);
              setDone(null);
              setError(null);
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Choose CSV file
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
            Download template
          </Button>
          {fileName ? <span className="text-muted-foreground">{fileName}</span> : null}
        </div>
        {csv && !preview && !done ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => void post(true)}>
            {busy ? "Checking…" : "Preview import"}
          </Button>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : null}
        {shown ? (
          <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <p className="font-medium text-foreground">
              {done ? "Imported: " : "This file would add "}
              {shown.created} new · {shown.updated} updated · {shown.unchanged} unchanged · {shown.errors} with problems
            </p>
            {shown.unknownColumns.length ? (
              <p className="text-xs text-muted-foreground">Ignored columns: {shown.unknownColumns.join(", ")}</p>
            ) : null}
            <ul className="max-h-56 space-y-0.5 overflow-y-auto text-xs">
              {shown.rows.map((row) => (
                <li key={row.line} className={row.outcome === "error" ? "text-destructive" : "text-muted-foreground"}>
                  Row {row.line}: {row.name || "(no name)"} · {row.outcome}
                  {row.message ? ` (${row.message})` : ""}
                </li>
              ))}
            </ul>
            {preview && !done ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busy || toWrite === 0} onClick={() => void post(false)}>
                  {busy ? "Importing…" : `Import ${toWrite} school${toWrite === 1 ? "" : "s"}`}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MergeDialog({
  school,
  schools,
  onClose,
  onMerge,
}: {
  school: AdminSchool;
  schools: AdminSchool[];
  onClose: () => void;
  onMerge: (intoId: string) => Promise<void>;
}) {
  const [intoId, setIntoId] = useState("");
  const into = schools.find((s) => s.id === intoId);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Merge {school.name}</DialogTitle>
          <DialogDescription>
            Moves its {school.counts.students} student(s), {school.counts.campaigns} campaign(s) and{" "}
            {school.counts.applications} application(s), plus any awards, payments and recommendations, to the school you
            keep. This one is then archived.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <Label htmlFor="merge-into">Keep this school</Label>
            <select
              id="merge-into"
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2"
              value={intoId}
              onChange={(e) => setIntoId(e.target.value)}
            >
              <option value="">Choose…</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.city ? ` — ${s.city}` : ""}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="destructive"
            disabled={!intoId}
            onClick={() => {
              if (window.confirm(`Merge “${school.name}” into “${into?.name}”? This can't be undone from here.`)) void onMerge(intoId);
            }}
          >
            Merge
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
