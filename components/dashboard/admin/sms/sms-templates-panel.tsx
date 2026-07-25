"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SmsTemplate = { id: string; title: string; message: string; category?: string | null };

export function SmsTemplatesPanel() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/sms/templates", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { templates?: SmsTemplate[] } | null;
    if (res.ok) setTemplates(data?.templates ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function reset() {
    setEditId(null);
    setTitle("");
    setCategory("");
    setMessage("");
  }

  function edit(t: SmsTemplate) {
    setEditId(t.id);
    setTitle(t.title);
    setCategory(t.category ?? "");
    setMessage(t.message);
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/sms/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId ?? undefined, title, category, message }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not save template.");
      setNotice(editId ? "Template updated." : "Template created.");
      reset();
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save template.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this template?")) return;
    await fetch("/api/admin/sms/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, delete: true }),
    });
    if (editId === id) reset();
    await load();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="border-border/80">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-primary"><FileText className="size-5" /><h2 className="font-heading text-lg">SMS templates</h2></div>
          {loading ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : templates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No templates yet. Create one on the right.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/80 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="font-medium text-foreground">{t.title}</p>{t.category ? <Badge variant="outline" className="text-[10px]">{t.category}</Badge> : null}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.message}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => edit(t)}><Pencil className="size-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="size-8 text-destructive hover:bg-destructive/10" onClick={() => void remove(t.id)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-base text-primary">{editId ? "Edit template" : "New template"}</h3>
            {editId ? <Button type="button" size="sm" variant="ghost" onClick={reset}>Cancel</Button> : null}
          </div>
          <div><Label className="text-xs text-muted-foreground">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Category (optional)</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1" placeholder="e.g. Reminders" /></div>
          <div><Label className="text-xs text-muted-foreground">Message</Label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 min-h-[140px]" maxLength={1600} /></div>
          {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p> : null}
          <Button type="button" onClick={() => void save()} disabled={busy || !title.trim() || !message.trim()} className="w-full">
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : editId ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
            {editId ? "Save changes" : "Create template"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
