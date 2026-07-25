"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EmailComposePanel() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), text: text.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Could not send email.");
      setNotice(`Sent to ${to.trim()}.`);
      setTo("");
      setSubject("");
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 p-4">
        <div>
          <p className="font-heading text-base font-semibold text-primary">Compose email</p>
          <p className="text-sm text-muted-foreground">Send a one-off message from your verified sender. It&apos;s logged in History.</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="person@example.com" type="email" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Message</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[180px]" placeholder="Write your message…" />
        </div>
        {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p> : null}
        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="button" onClick={() => void send()} disabled={busy || !to.trim() || !subject.trim() || !text.trim()}>
            {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Send className="mr-1.5 size-4" />}
            Send email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
