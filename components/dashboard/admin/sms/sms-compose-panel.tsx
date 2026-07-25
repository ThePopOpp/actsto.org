"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, MessageSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NONE = "__none__";

type SmsTemplate = { id: string; title: string; message: string; category?: string | null };
type Runtime = { ready: boolean; sender: string };

function segments(len: number) {
  if (len === 0) return 0;
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

export function SmsComposePanel() {
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [to, setTo] = useState(() => searchParams.get("to") ?? "");
  const [templateId, setTemplateId] = useState(NONE);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [tplRes, thrRes] = await Promise.all([
        fetch("/api/admin/sms/templates", { cache: "no-store" }),
        fetch("/api/admin/sms/threads", { cache: "no-store" }),
      ]);
      const tpl = (await tplRes.json().catch(() => null)) as { templates?: SmsTemplate[] } | null;
      const thr = (await thrRes.json().catch(() => null)) as { runtime?: Runtime } | null;
      if (tplRes.ok) setTemplates(tpl?.templates ?? []);
      if (thrRes.ok) setRuntime(thr?.runtime ?? null);
    })();
  }, []);

  function pickTemplate(id: string | null) {
    const next = id ?? NONE;
    setTemplateId(next);
    if (next !== NONE) {
      const t = templates.find((x) => x.id === next);
      if (t) setMessage(t.message);
    }
  }

  const count = message.length;
  const segs = useMemo(() => segments(count), [count]);
  const canSend = Boolean(to.trim()) && Boolean(message.trim()) && !busy && Boolean(runtime?.ready);

  async function send() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, message }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; sent?: number; failed?: number } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not send SMS.");
      setNotice(`Sent ${data?.sent ?? 0} message(s). Failed ${data?.failed ?? 0}.`);
      setMessage("");
      setTemplateId(NONE);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send SMS.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2 text-primary">
          <MessageSquare className="size-5" />
          <h2 className="font-heading text-lg">Send SMS</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Sends through the server-side Twilio route. Separate multiple numbers with commas or new lines (max 50).{" "}
          {runtime ? (
            <span className={runtime.ready ? "text-emerald-600" : "text-destructive"}>
              Twilio {runtime.ready ? `ready · ${runtime.sender}` : "needs configuration"}.
            </span>
          ) : null}
        </p>

        {/* Recipient + template picker on the same row */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <Label className="text-xs text-muted-foreground">Recipient phone(s)</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="(602) 555-0100" className="mt-1" />
          </div>
          <div className="w-64">
            <Label className="text-xs text-muted-foreground">Template</Label>
            <Select value={templateId} onValueChange={pickTemplate}>
              <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="No template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No template</SelectItem>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 min-h-[160px]" maxLength={1600} placeholder="Type your message…" />
          <p className="mt-1 text-right text-xs text-muted-foreground">{count} chars · ~{segs} segment{segs === 1 ? "" : "s"}</p>
        </div>

        {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p> : null}

        <div className="flex justify-end">
          <Button type="button" onClick={() => void send()} disabled={!canSend}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />} Send SMS
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
