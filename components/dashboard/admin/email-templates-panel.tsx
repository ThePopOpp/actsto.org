"use client";

import { useEffect, useState } from "react";
import { Copy, Mail, Plus, Trash2 } from "lucide-react";

import { BlockEditor } from "@/components/dashboard/admin/blog/block-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { coerceBlocks, type BlogBlock } from "@/lib/blog/blocks";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  title: string;
  subject?: string | null;
  preheader?: string | null;
  status: string;
  content?: string | null;
  blocks?: unknown;
  sourceBlogPostId?: string | null;
  updatedAt: string;
};

function fmt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  }).format(new Date(value));
}

export function EmailTemplatesPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [status, setStatus] = useState("draft");
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  async function load() {
    const res = await fetch("/api/admin/email-templates", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { templates?: Template[] } | null;
    if (res.ok) setTemplates(data?.templates ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  function edit(t: Template) {
    setSelected(t);
    setTitle(t.title);
    setSubject(t.subject ?? "");
    setPreheader(t.preheader ?? "");
    setStatus(t.status);
    setBlocks(coerceBlocks(t.blocks));
    setPreviewHtml(t.content ?? "");
    setNotice(null);
  }

  function startNew() {
    setSelected(null);
    setTitle("New email template");
    setSubject("");
    setPreheader("");
    setStatus("draft");
    setBlocks([]);
    setPreviewHtml("");
    setNotice(null);
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const payload = { title, subject, preheader, status, blocks };
      const res = await fetch(
        selected ? `/api/admin/email-templates/${selected.id}` : "/api/admin/email-templates",
        {
          method: selected ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json().catch(() => null)) as { template?: Template; error?: string } | null;
      if (!res.ok || !data?.template) throw new Error(data?.error ?? "Could not save template.");
      setPreviewHtml(data.template.content ?? "");
      setSelected(data.template);
      setNotice("Template saved.");
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save template.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: Template) {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    await fetch(`/api/admin/email-templates/${t.id}`, { method: "DELETE" });
    if (selected?.id === t.id) startNew();
    await load();
  }

  function copyHtml() {
    if (!previewHtml) return;
    void navigator.clipboard?.writeText(previewHtml);
    setNotice("Email HTML copied to clipboard.");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="border-border/80">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="font-heading text-base text-primary">Templates</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={startNew}>
            <Plus className="mr-1 size-3.5" /> New
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.length ? (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => edit(t)}
                className={cn(
                  "flex w-full flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40",
                  selected?.id === t.id ? "border-primary bg-primary/5" : "border-border/80",
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{t.title}</span>
                  <Badge variant={t.status === "ready" ? "secondary" : "outline"}>{t.status}</Badge>
                </span>
                <span className="text-xs text-muted-foreground">{fmt(t.updatedAt)}</span>
              </button>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No templates yet. Create one, or use “Convert to email template” on a blog post.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {notice ? (
          <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p>
        ) : null}

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-lg text-primary">
              <Mail className="size-5" />
              {selected ? "Edit template" : "New template"}
            </CardTitle>
            <CardDescription>
              Build with the same blocks as blog posts. Saved as inline-styled, email-client-ready HTML.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="et-title">Internal title</Label>
                <Input id="et-title" className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="et-subject">Subject line</Label>
                <Input id="et-subject" className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="et-pre">Preheader (inbox preview text)</Label>
              <Input id="et-pre" className="mt-1.5" value={preheader} onChange={(e) => setPreheader(e.target.value)} />
            </div>
            <div>
              <Label>Content blocks</Label>
              <div className="mt-1.5">
                <BlockEditor value={blocks} onChange={setBlocks} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <Button type="button" onClick={() => void save()} disabled={busy || !title.trim()}>
                {busy ? "Saving…" : selected ? "Save changes" : "Create template"}
              </Button>
              {previewHtml ? (
                <Button type="button" variant="outline" onClick={copyHtml}>
                  <Copy className="mr-2 size-4" /> Copy HTML
                </Button>
              ) : null}
              {selected ? (
                <Button type="button" variant="destructive" onClick={() => void remove(selected)}>
                  <Trash2 className="mr-2 size-4" /> Delete
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {previewHtml ? (
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">Email preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border border-border">
                <iframe title="Email preview" srcDoc={previewHtml} className="h-[520px] w-full bg-white" />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
