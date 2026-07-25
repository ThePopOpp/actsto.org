"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Template = { id: string; title: string; subject: string | null; content: string | null; status: string };
const NONE = "__none__";

export function EmailComposePanel() {
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [templateId, setTemplateId] = useState<string>(NONE);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch("/api/admin/email-templates", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { templates?: Template[] } | null;
      if (!active || !res.ok || !data) return;
      const list = data.templates ?? [];
      setTemplates(list);
      const pre = searchParams.get("template");
      if (pre) {
        const t = list.find((x) => x.id === pre);
        if (t) { setTemplateId(t.id); setSubject(t.subject ?? ""); }
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = templates.find((t) => t.id === templateId) ?? null;

  function pickTemplate(id: string | null) {
    const next = id ?? NONE;
    setTemplateId(next);
    if (next !== NONE) {
      const t = templates.find((x) => x.id === next);
      if (t?.subject) setSubject(t.subject);
    }
  }

  async function send() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const body = selected
        ? { to: to.trim(), subject: subject.trim(), html: selected.content ?? "" }
        : { to: to.trim(), subject: subject.trim(), text: text.trim() };
      const res = await fetch("/api/admin/email/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Could not send email.");
      setNotice(`Sent to ${to.trim()}.`);
      setTo("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send email.");
    } finally {
      setBusy(false);
    }
  }

  const canSend = to.includes("@") && subject.trim() && (selected ? Boolean(selected.content) : text.trim());

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 p-4">
        <div>
          <p className="font-heading text-base font-semibold text-primary">Compose email</p>
          <p className="text-sm text-muted-foreground">Send a one-off message, or pick a saved template to send its designed HTML. Logged in History.</p>
        </div>

        <div><Label className="text-xs text-muted-foreground">To</Label><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="person@example.com" type="email" className="mt-1" /></div>

        {/* Subject + template picker on the same row */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1"><Label className="text-xs text-muted-foreground">Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" className="mt-1" /></div>
          <div className="w-64">
            <Label className="text-xs text-muted-foreground">Template</Label>
            <Select value={templateId} onValueChange={pickTemplate}>
              <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="No template (manual)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No template (manual)</SelectItem>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}{t.status !== "ready" ? ` (${t.status})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selected ? (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Using template: <strong className="text-foreground">{selected.title}</strong></p>
            <iframe title="Template preview" srcDoc={selected.content ?? ""} className="h-64 w-full rounded-lg border border-border bg-white" />
          </div>
        ) : (
          <div><Label className="text-xs text-muted-foreground">Message</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-1 min-h-[180px]" placeholder="Write your message…" /></div>
        )}

        {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p> : null}
        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="button" onClick={() => void send()} disabled={busy || !canSend}>{busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Send className="mr-1.5 size-4" />} Send email</Button>
        </div>
      </CardContent>
    </Card>
  );
}
