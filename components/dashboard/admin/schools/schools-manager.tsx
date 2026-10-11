"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminSchool, TypedSchoolName } from "@/app/api/admin/schools/route";

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
  const [editing, setEditing] = useState<AdminSchool | null>(null);
  const [merging, setMerging] = useState<AdminSchool | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [newName, setNewName] = useState("");

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
                    <td className="py-2 pr-3 text-right tabular-nums">{s.counts.students}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.counts.campaigns}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.counts.applications}</td>
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
          <form
            className="mt-4 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await send("/api/admin/schools", "POST", { name: newName });
                setNewName("");
              }, "School added.");
            }}
          >
            <div>
              <Label htmlFor="new-school">Add a school</Label>
              <Input id="new-school" className="mt-1.5 w-72" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <Button type="submit" variant="outline" disabled={!newName.trim()}>
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

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
        <EditSchoolDialog
          school={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) =>
            run(async () => {
              await send(`/api/admin/schools/${editing.id}`, "PATCH", patch);
              setEditing(null);
            }, "School saved.")
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

function EditSchoolDialog({
  school,
  onClose,
  onSave,
}: {
  school: AdminSchool;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: school.name,
    addressLine1: school.addressLine1,
    city: school.city,
    state: school.state || "AZ",
    zip: school.zip,
    website: school.website,
    phone: school.phone,
    email: school.email,
    logoUrl: school.logoUrl,
    isPartner: school.isPartner,
    status: school.status,
  });
  const field = (key: keyof typeof form, label: string, cls = "") => (
    <div className={cls}>
      <Label htmlFor={`sch-${key}`}>{label}</Label>
      <Input
        id={`sch-${key}`}
        className="mt-1.5"
        value={String(form[key] ?? "")}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Edit school</DialogTitle>
          <DialogDescription>Shown on campaign pages and used for allocation and reporting.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("name", "Name", "sm:col-span-2")}
          {field("addressLine1", "Street address", "sm:col-span-2")}
          {field("city", "City")}
          <div className="grid grid-cols-2 gap-3">
            {field("state", "State")}
            {field("zip", "ZIP")}
          </div>
          {field("website", "Website", "sm:col-span-2")}
          {field("phone", "Phone")}
          {field("email", "Email")}
          {field("logoUrl", "Logo URL", "sm:col-span-2")}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={form.isPartner} onChange={(e) => setForm({ ...form, isPartner: e.target.checked })} />
            Partner school
          </label>
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
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Put the street on the street line and the city in City; the page builds the full address from both.
          </p>
          <div className="sm:col-span-2">
            <Button type="button" onClick={() => void onSave(form)}>
              Save school
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
