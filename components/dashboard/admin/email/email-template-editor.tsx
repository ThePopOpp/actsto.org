"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Code2, Copy, Eye, LayoutGrid, Loader2, Save } from "lucide-react";

import { BlockEditor } from "@/components/dashboard/admin/blog/block-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { blocksToHtml, coerceBlocks, type BlogBlock } from "@/lib/blog/blocks";
import { EMAIL_MERGE_FIELDS } from "@/lib/email/merge-fields";

type Mode = "visual" | "html";

function previewShell(inner: string) {
  return `<div style="background:#f5fbff;padding:24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:14px;padding:28px;font-family:Arial,Helvetica,sans-serif;"><tr><td>${inner}</td></tr></table></td></tr></table></div>`;
}

export function EmailTemplateEditor({ editId }: { editId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("New email template");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [status, setStatus] = useState("draft");
  const [mode, setMode] = useState<Mode>("visual");
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);
  const [html, setHtml] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    (async () => {
      const res = await fetch(`/api/admin/email-templates/${editId}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { template?: { title: string; subject: string | null; preheader: string | null; status: string; blocks: unknown; content: string | null } } | null;
      if (!active || !res.ok || !data?.template) return;
      const t = data.template;
      setTitle(t.title);
      setSubject(t.subject ?? "");
      setPreheader(t.preheader ?? "");
      setStatus(t.status);
      const b = coerceBlocks(t.blocks);
      if (b.length) { setBlocks(b); setMode("visual"); } else { setHtml(t.content ?? ""); setMode("html"); }
    })();
    return () => { active = false; };
  }, [editId]);

  const previewHtml = useMemo(() => previewShell(mode === "visual" ? blocksToHtml(blocks) : html), [mode, blocks, html]);

  const save = useCallback(async () => {
    if (!title.trim()) { setNotice("A title is required."); return; }
    setBusy(true);
    setNotice(null);
    const payload = mode === "visual"
      ? { title, subject, preheader, status, blocks }
      : { title, subject, preheader, status, blocks: [], content: html };
    const res = await fetch(editId ? `/api/admin/email-templates/${editId}` : "/api/admin/email-templates", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as { template?: { id: string }; error?: string } | null;
    setBusy(false);
    if (!res.ok || !data?.template) { setNotice(data?.error ?? "Could not save."); return; }
    router.push(`/dashboard/admin/email?tab=editor&id=${data.template.id}`);
    setNotice("Template saved.");
  }, [title, subject, preheader, status, mode, blocks, html, editId, router]);

  function copyField(token: string) {
    void navigator.clipboard?.writeText(token);
    setNotice(`Copied ${token}`);
    window.setTimeout(() => setNotice(null), 1500);
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card p-3">
        <span className="font-heading text-sm font-semibold text-primary">{editId ? "Edit template" : "New template"}</span>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            <button type="button" onClick={() => setMode("visual")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${mode === "visual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><LayoutGrid className="size-4" /> Visual</button>
            <button type="button" onClick={() => setMode("html")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${mode === "html" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Code2 className="size-4" /> HTML</button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}><Eye className="mr-1.5 size-4" /> {showPreview ? "Hide" : "Show"} preview</Button>
          <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>{busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />} Save</Button>
        </div>
      </div>

      {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p> : null}

      {/* Meta */}
      <Card className="border-border/80">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <div><Label className="text-xs text-muted-foreground">Internal title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Subject line</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Preheader (inbox preview)</Label><Input value={preheader} onChange={(e) => setPreheader(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "draft")}><SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="ready">Ready</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic fields */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dynamic fields — click to copy</p>
        <div className="flex flex-wrap gap-1.5">
          {EMAIL_MERGE_FIELDS.map((f) => (
            <button key={f.token} type="button" onClick={() => copyField(f.token)} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground hover:bg-muted" title={f.label}>
              <Copy className="size-3" /> {f.token}
            </button>
          ))}
        </div>
      </div>

      <div className={showPreview ? "grid gap-4 xl:grid-cols-2" : ""}>
        {/* Editor */}
        <div>
          {mode === "visual" ? (
            <BlockEditor value={blocks} onChange={setBlocks} />
          ) : (
            <div>
              <Label className="text-xs text-muted-foreground">Email HTML (inner body — the 600px shell is added automatically)</Label>
              <Textarea value={html} onChange={(e) => setHtml(e.target.value)} className="mt-1 min-h-[420px] font-mono text-xs" placeholder="<h1>Hello {{first_name}}</h1><p>…</p>" />
            </div>
          )}
        </div>
        {/* Preview */}
        {showPreview ? (
          <div className="xl:sticky xl:top-4 xl:self-start">
            <p className="mb-2 text-center text-xs text-muted-foreground">Live preview</p>
            <iframe title="Email preview" srcDoc={previewHtml} className="h-[560px] w-full rounded-lg border border-border bg-white" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
