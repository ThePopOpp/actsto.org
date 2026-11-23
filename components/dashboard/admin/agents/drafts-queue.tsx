"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type DraftRow = {
  id: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  segment: string | null;
  createdAt: string;
  agentName: string | null;
  leadName: string | null;
  leadCompany: string | null;
  leadSourceUrl: string | null;
};

function DraftCard({ draft }: { draft: DraftRow }) {
  const router = useRouter();
  const [subject, setSubject] = useState(draft.subject);
  const [bodyText, setBodyText] = useState(draft.bodyText);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/agents/drafts/${draft.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res.ok) {
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="text-base">
          To {draft.leadName ? `${draft.leadName} · ` : ""}
          <span className="font-mono text-sm">{draft.toEmail}</span>
        </CardTitle>
        <CardDescription>
          Written by {draft.agentName ?? "staff"} · {new Date(draft.createdAt).toLocaleString()}
          {draft.segment ? ` · ${draft.segment}` : ""}
          {draft.leadCompany ? ` · ${draft.leadCompany}` : ""}
          {draft.leadSourceUrl ? (
            <>
              {" · "}
              <a href={draft.leadSourceUrl} target="_blank" rel="noreferrer noopener" className="underline">
                where this lead was found
              </a>
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1">
          <Label htmlFor={`${draft.id}-subject`}>Subject</Label>
          <Input id={`${draft.id}-subject`} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${draft.id}-body`}>Message</Label>
          <Textarea id={`${draft.id}-body`} rows={10} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
          <p className="text-xs text-muted-foreground">A footer saying an AI assistant wrote it and staff reviewed it, ACT&apos;s address, and an unsubscribe link are added when it sends.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            disabled={busy}
            onClick={() => window.confirm(`Send this email to ${draft.toEmail} now?`) && act({ action: "send", subject, bodyText })}
          >
            <Send className="mr-1.5 h-4 w-4" aria-hidden /> Approve &amp; send
          </Button>
          <div className="flex min-w-[220px] flex-1 items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor={`${draft.id}-note`} className="text-xs">Note for the agent (optional)</Label>
              <Input id={`${draft.id}-note`} placeholder="Too long; mention the corporate credit" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button variant="outline" disabled={busy} onClick={() => act({ action: "reject", note })}>
              <X className="mr-1.5 h-4 w-4" aria-hidden /> Reject
            </Button>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

export function DraftsQueue({ drafts }: { drafts: DraftRow[] }) {
  if (!drafts.length) {
    return <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing waiting. Drafts from the agents show up here for you to approve.</p>;
  }
  return (
    <div className="space-y-4">
      {drafts.map((d) => (
        <DraftCard key={d.id} draft={d} />
      ))}
    </div>
  );
}
