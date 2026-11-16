"use client";

import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";

import { CopyButton } from "@/components/proposals/admin/copy-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Built = { subject: string; html: string; text: string };

/** Preview, test, copy and send the proposal email. */
export function ProposalEmailPanel({ proposalKey, defaultSubject, linkLive, adminEmail }: { proposalKey: string; defaultSubject: string; linkLive: boolean; adminEmail: string }) {
  const [subject, setSubject] = useState(defaultSubject);
  const [built, setBuilt] = useState<Built | null>(null);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (s: string) => {
    const res = await fetch(`/api/admin/proposals/${proposalKey}/email?subject=${encodeURIComponent(s)}`, { cache: "no-store" });
    if (res.ok) setBuilt((await res.json()) as Built);
  }, [proposalKey]);

  useEffect(() => {
    const t = setTimeout(() => void load(subject), 300);
    return () => clearTimeout(t);
  }, [subject, load]);

  async function send(mode: "test" | "send") {
    if (mode === "send" && !window.confirm(`Send the proposal email to ${to}?`)) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/proposals/${proposalKey}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, to, subject }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; to?: string } | null;
    setBusy(false);
    setMessage(res.ok ? { ok: true, text: `Sent to ${data?.to}. It's in Email history.` } : { ok: false, text: data?.error ?? "Not sent." });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Preview</CardTitle>
          <CardDescription>Built for mail clients: tables and inline styles, so it looks the same in Gmail and Outlook.</CardDescription>
        </CardHeader>
        <CardContent>
          {built ? (
            <iframe title="Email preview" srcDoc={built.html} sandbox="" className="h-[1500px] w-full max-w-[660px] rounded-md border border-border bg-white" />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!linkLive ? (
          <Alert>
            <AlertDescription>
              The private link is off, so the email has no &quot;View the full proposal&quot; button. Turn the link on in Overview to include it.
            </AlertDescription>
          </Alert>
        ) : null}
        <Card className="border-border/80">
          <CardContent className="space-y-4 p-5 text-sm">
            <div>
              <Label htmlFor="em-subject">Subject</Label>
              <Input id="em-subject" className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void send("test")}>
                Send test to me
              </Button>
              {built ? <CopyButton text={built.html} label="Copy HTML" /> : null}
              {built ? <CopyButton text={built.text} label="Copy text" /> : null}
            </div>
            <p className="text-xs text-muted-foreground">Tests go to {adminEmail} with [Test] in the subject.</p>
            <div className="border-t border-border pt-4">
              <Label htmlFor="em-to">Send to</Label>
              <Input id="em-to" type="email" className="mt-1.5" placeholder="name@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
              <Button type="button" className="mt-3" disabled={busy || !to.trim()} onClick={() => void send("send")}>
                <Send className="mr-1.5 size-4" /> {busy ? "Sending…" : "Send proposal"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">Replies go to the signer&apos;s email. Every send is logged.</p>
            </div>
            {message ? (
              <p role="status" className={message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
                {message.text}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
