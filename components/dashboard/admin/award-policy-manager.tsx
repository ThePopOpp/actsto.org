"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ExternalLink } from "lucide-react";

import { RichTextField } from "@/components/dashboard/admin/blog/rich-text-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AWARD_SUMMARY_PATH } from "@/lib/award-policy/public-page";
import { formatDateTime } from "@/lib/format-date";

type Version = { id: string; title: string; bodyHtml: string; status: string; publishedAt: string | null; createdByEmail: string | null; createdAt: string };
type EditorData = {
  latest: Version;
  published: Version | null;
  history: { id: string; status: string; title: string; createdAt: string; createdByEmail: string | null; publishedAt: string | null }[];
};
type PolicyDoc = {
  id: string;
  versionLabel: string;
  fileName: string;
  sizeBytes: number;
  adoptedOn: string | null;
  isCurrent: boolean;
  note: string | null;
  uploadedByEmail: string | null;
  uploadedAt: string;
};

/**
 * The award policy, two parts. The public summary is the page at
 * /how-we-award-scholarships, edited here with no deploy; every save is kept.
 * The full policy is Super Admin only: PDFs by version, one marked current,
 * opened through a short-lived signed link.
 */
export function AwardPolicyManager() {
  const [data, setData] = useState<EditorData | null>(null);
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [editorKey, setEditorKey] = useState("initial");
  const [docs, setDocs] = useState<PolicyDoc[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [upload, setUpload] = useState({ versionLabel: "", adoptedOn: "", note: "", makeCurrent: true });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const restoreCount = useRef(0);

  const load = useCallback(async () => {
    const [pageRes, docsRes] = await Promise.all([
      fetch("/api/admin/award-policy/page", { cache: "no-store" }),
      fetch("/api/admin/award-policy/documents", { cache: "no-store" }),
    ]);
    const page = (await pageRes.json().catch(() => null)) as EditorData | null;
    const list = (await docsRes.json().catch(() => null)) as { documents?: PolicyDoc[] } | null;
    if (page?.latest) {
      setData(page);
      setTitle(page.latest.title);
      setHtml(page.latest.bodyHtml);
      setEditorKey(page.latest.id || "starter");
    }
    setDocs(list?.documents ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount, as elsewhere in admin
    void load();
  }, [load]);

  async function save(publish: boolean) {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/award-policy/page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, bodyHtml: html, publish }),
    });
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: json?.error ?? "Not saved." });
    setMessage({ ok: true, text: publish ? "Published. The public page shows this version now." : "Draft saved. The public page hasn't changed." });
    await load();
  }

  async function unpublish() {
    if (!window.confirm("Take the public page down? It will show a short holding message until you publish again.")) return;
    await fetch("/api/admin/award-policy/page", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unpublish" }) });
    setMessage({ ok: true, text: "Unpublished. Every version is still kept." });
    await load();
  }

  async function restore(id: string) {
    const res = await fetch(`/api/admin/award-policy/page?version=${encodeURIComponent(id)}`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as { version?: Version } | null;
    if (!json?.version) return;
    setTitle(json.version.title);
    setHtml(json.version.bodyHtml);
    restoreCount.current += 1;
    setEditorKey(`restore-${id}-${restoreCount.current}`);
    setMessage({ ok: true, text: "Loaded that version into the editor. Save or publish to use it." });
  }

  async function uploadPolicy() {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    form.append("versionLabel", upload.versionLabel);
    form.append("adoptedOn", upload.adoptedOn);
    form.append("note", upload.note);
    form.append("makeCurrent", String(upload.makeCurrent));
    const res = await fetch("/api/admin/award-policy/documents", { method: "POST", body: form });
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: json?.error ?? "Not uploaded." });
    setFile(null);
    setUpload({ versionLabel: "", adoptedOn: "", note: "", makeCurrent: true });
    setMessage({ ok: true, text: "Policy version uploaded." });
    await load();
  }

  async function makeCurrent(id: string) {
    await fetch("/api/admin/award-policy/documents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, makeCurrent: true }) });
    await load();
  }

  const current = docs.find((d) => d.isCurrent);

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-primary">Public summary: How we award scholarships</CardTitle>
            <CardDescription>
              Public, no login, at a fixed address for donation materials and the ADOR filing. Only this summary is
              public; never paste or link the full policy here.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={data?.published ? "secondary" : "outline"}>
              {data?.published ? `Published ${formatDateTime(data.published.publishedAt)}` : "Not published yet"}
            </Badge>
            <a href={AWARD_SUMMARY_PATH} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-muted">
              <ExternalLink className="size-4" /> actsto.org{AWARD_SUMMARY_PATH}
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!data?.published ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Until you publish, the public page shows a short holding message and the required ADOR notice. Paste the
              final text of section 9 (the public summary) and publish.
            </p>
          ) : null}
          <div>
            <Label htmlFor="summary-title">Page title</Label>
            <Input id="summary-title" className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="rounded-md border border-input">
            <RichTextField key={editorKey} value={html} onChange={setHtml} placeholder="Paste or write the public summary…" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void save(false)}>
              Save draft
            </Button>
            <Button type="button" disabled={busy} onClick={() => void save(true)}>
              Publish
            </Button>
            {data?.published ? (
              <Button type="button" variant="ghost" className="text-destructive" onClick={() => void unpublish()}>
                Unpublish
              </Button>
            ) : null}
          </div>
          {data?.history.length ? (
            <div>
              <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Change history</p>
              <ul className="mt-1 max-h-56 space-y-1 overflow-y-auto text-sm">
                {data.history.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    <span>
                      {formatDateTime(h.createdAt)} · {h.status === "published" ? "Published" : h.publishedAt ? "Published, later replaced" : "Draft"} by{" "}
                      {h.createdByEmail ?? "staff"}
                    </span>
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => void restore(h.id)}>
                      Load
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Full Scholarship Award Policy (Super Admins only)</CardTitle>
          <CardDescription>
            Not visible to parents, donors, schools or other admin roles, and not reachable by a direct link: each open
            uses a short-lived signed link after a Super Admin check. Keep every version, so the policy in force for any
            award year can be found for an audit.
            {current ? ` Current: ${current.versionLabel}${current.adoptedOn ? `, adopted ${current.adoptedOn}` : ""}.` : " No version is marked current."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {docs.length ? (
            <ul className="divide-y divide-border/60">
              {docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium text-foreground">{d.versionLabel}</span>{" "}
                    {d.isCurrent ? <Badge variant="secondary">Current</Badge> : null}
                    <span className="block text-xs text-muted-foreground">
                      {d.fileName} · {d.adoptedOn ? `adopted ${d.adoptedOn} · ` : ""}uploaded {formatDateTime(d.uploadedAt)} by {d.uploadedByEmail ?? "staff"}
                      {d.note ? ` · ${d.note}` : ""}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <a href={`/api/admin/award-policy/documents/${d.id}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-input px-2 text-xs hover:bg-muted">
                      <ExternalLink className="size-3.5" /> Open
                    </a>
                    <a href={`/api/admin/award-policy/documents/${d.id}?download=1`} className="inline-flex h-8 items-center gap-1 rounded-md border border-input px-2 text-xs hover:bg-muted">
                      <Download className="size-3.5" /> Download
                    </a>
                    {!d.isCurrent ? (
                      <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => void makeCurrent(d.id)}>
                        Mark current
                      </Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No policy uploaded yet.</p>
          )}
          <div className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                Choose policy PDF
              </Button>
              {file ? <span className="ml-2 text-muted-foreground">{file.name}</span> : null}
            </div>
            <div>
              <Label htmlFor="pol-label" className="text-xs">Version name</Label>
              <Input id="pol-label" className="mt-1" placeholder="e.g. Adopted October 2026" value={upload.versionLabel} onChange={(e) => setUpload({ ...upload, versionLabel: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pol-adopted" className="text-xs">Adoption date</Label>
              <Input id="pol-adopted" type="date" className="mt-1" value={upload.adoptedOn} onChange={(e) => setUpload({ ...upload, adoptedOn: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="pol-note" className="text-xs">Note (optional)</Label>
              <Input id="pol-note" className="mt-1" value={upload.note} onChange={(e) => setUpload({ ...upload, note: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={upload.makeCurrent} onChange={(e) => setUpload({ ...upload, makeCurrent: e.target.checked })} />
              Mark as the current version
            </label>
            <div className="sm:text-right">
              <Button type="button" size="sm" disabled={busy || !file || !upload.versionLabel.trim()} onClick={() => void uploadPolicy()}>
                {busy ? "Uploading…" : "Upload version"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-sm text-destructive"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
