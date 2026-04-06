"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Flag,
  GraduationCap,
  Heart,
  Inbox,
  Mail,
  MessageSquare,
  Send,
  User,
  Users,
} from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ROLE_LABEL, type UserRole } from "@/lib/auth/types";
import {
  COMPOSE_TEMPLATES,
  EMAIL_BROADCAST_SEGMENTS,
  MOCK_INBOUND_MESSAGES,
  type BroadcastSegment,
  type InboundMessage,
  getComposeRecipientOptions,
} from "@/lib/admin/inbox-mock";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

type InboxFilter = "all" | "unread" | "flagged" | "email" | "sms" | "campaign";

function roleIcon(role?: UserRole) {
  switch (role) {
    case "parent":
      return Heart;
    case "student":
      return GraduationCap;
    case "donor_business":
      return Building2;
    case "donor_individual":
      return User;
    default:
      return User;
  }
}

export function AdminInboxWorkspace() {
  const [messages, setMessages] = useState<InboundMessage[]>(() => [...MOCK_INBOUND_MESSAGES]);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_INBOUND_MESSAGES[0]?.id ?? null);

  const [recipientMode, setRecipientMode] = useState<"individual" | "group">("individual");
  const recipientOptions = useMemo(() => getComposeRecipientOptions(), []);
  const [individualEmail, setIndividualEmail] = useState(recipientOptions[0]?.value ?? "");
  const [segmentIds, setSegmentIds] = useState<Set<string>>(() => new Set());
  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendHint, setSendHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      if (filter === "unread" && !m.unread) return false;
      if (filter === "flagged" && !m.flagged) return false;
      if (filter === "email" && m.channel !== "email") return false;
      if (filter === "sms" && m.channel !== "sms") return false;
      if (filter === "campaign" && !m.campaignSlug) return false;
      return true;
    });
  }, [messages, filter]);

  const selected = messages.find((m) => m.id === selectedId) ?? filtered[0] ?? null;

  function selectMessage(m: InboundMessage) {
    setSelectedId(m.id);
    if (m.unread) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, unread: false } : x)));
    }
  }

  function toggleFlag(id: string) {
    setMessages((prev) =>
      prev.map((x) => (x.id === id ? { ...x, flagged: !x.flagged } : x))
    );
  }

  function toggleSegment(seg: BroadcastSegment, checked: boolean) {
    setSegmentIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(seg.id);
      else next.delete(seg.id);
      return next;
    });
  }

  const estimatedGroupReach = useMemo(() => {
    let n = 0;
    for (const s of EMAIL_BROADCAST_SEGMENTS) {
      if (segmentIds.has(s.id)) n += s.estimatedRecipients;
    }
    return n;
  }, [segmentIds]);

  function applyTemplate(id: string) {
    const t = COMPOSE_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
    setTemplateId(id);
  }

  function submitSend(e: React.FormEvent) {
    e.preventDefault();
    setSendHint(null);
    if (!subject.trim() || !body.trim()) {
      setSendHint("Add a subject and message body.");
      return;
    }
    if (recipientMode === "individual" && !individualEmail.trim()) {
      setSendHint("Pick a recipient.");
      return;
    }
    if (recipientMode === "group" && segmentIds.size === 0) {
      setSendHint("Choose at least one audience segment.");
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      if (recipientMode === "individual") {
        setSendHint(`Demo only: queued 1 email to ${individualEmail}. Connect ESP (e.g. FluentCRM, SendGrid) to send.`);
      } else {
        setSendHint(
          `Demo only: queued broadcast to ~${estimatedGroupReach} recipients (segments overlap is not deduped in this preview).`
        );
      }
    }, 450);
  }

  const filters: { id: InboxFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "flagged", label: "Flagged" },
    { id: "email", label: "Email" },
    { id: "sms", label: "SMS" },
    { id: "campaign", label: "Campaign-linked" },
  ];

  return (
    <div className="space-y-10">
      <section aria-labelledby="inbox-review-heading">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="inbox-review-heading" className="font-heading text-xl font-semibold text-primary">
              Review incoming
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Prioritize by role and campaign context. Flag tax or compliance threads; SMS shows as
              short-form — escalate sensitive student conversations per your policy.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {messages.length} shown
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              className="h-8"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <Card className="mt-4 overflow-hidden border-border/80">
          <div className="grid min-h-[420px] lg:grid-cols-[minmax(0,340px)_1fr]">
            <div className="border-b border-border lg:border-r lg:border-b-0">
              <div className="max-h-[480px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No messages match this filter.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filtered.map((m) => {
                      const Icon = roleIcon(m.senderRole);
                      const active = selected?.id === m.id;
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => selectMessage(m)}
                            className={cn(
                              "flex w-full gap-3 p-3 text-left transition-colors hover:bg-muted/40",
                              active && "bg-muted/60"
                            )}
                          >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <Icon className="size-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium text-foreground">
                                  {m.fromName}
                                </span>
                                {m.unread ? (
                                  <span className="size-2 shrink-0 rounded-full bg-act-red" title="Unread" />
                                ) : null}
                                {m.flagged ? (
                                  <Flag className="size-3.5 shrink-0 text-amber-600" />
                                ) : null}
                              </div>
                              <p className="truncate text-xs text-muted-foreground">{m.subject}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {m.preview}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {m.channel === "sms" ? (
                                  <Badge variant="outline" className="text-[10px]">
                                    <MessageSquare className="size-3" />
                                    SMS
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">
                                    <Mail className="size-3" />
                                    Email
                                  </Badge>
                                )}
                                {m.senderRole ? (
                                  <Badge variant="outline" className="text-[10px]">
                                    {ROLE_LABEL[m.senderRole]}
                                  </Badge>
                                ) : null}
                                {m.campaignTitle ? (
                                  <Badge variant="outline" className="max-w-[140px] truncate text-[10px]">
                                    {m.campaignTitle}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="mt-2 text-[10px] text-muted-foreground tabular-nums">
                                {format(new Date(m.receivedAt), "MMM d, yyyy · h:mm a")}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex min-h-[320px] flex-col bg-background p-4 sm:p-6">
              {selected ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-lg font-semibold text-primary">
                          {selected.subject}
                        </h3>
                        {selected.channel === "sms" ? (
                          <Badge variant="outline">SMS</Badge>
                        ) : (
                          <Badge variant="secondary">Email</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        From{" "}
                        <span className="font-medium text-foreground">{selected.fromName}</span>
                        {selected.channel === "email" ? (
                          <>
                            {" "}
                            · <a className="text-primary hover:underline" href={`mailto:${selected.fromEmail}`}>{selected.fromEmail}</a>
                          </>
                        ) : (
                          <>
                            {" "}
                            · <span className="tabular-nums">{selected.fromPhone ?? selected.fromEmail}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={selected.flagged ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleFlag(selected.id)}
                      >
                        <Flag className="mr-1.5 size-3.5" />
                        {selected.flagged ? "Flagged" : "Flag"}
                      </Button>
                      <a
                        href={`mailto:${selected.fromEmail}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex items-center")}
                      >
                        <Mail className="mr-1.5 size-3.5" />
                        Reply in mail client
                      </a>
                    </div>
                  </div>

                  {selected.campaignSlug ? (
                    <div className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Related campaign: </span>
                      <Link
                        href={`/campaigns/${selected.campaignSlug}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {selected.campaignTitle}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        — review the public page before you promise timelines or amounts.
                      </span>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">
                      No campaign linked. If this person is a donor only, check CRM before referencing
                      a specific family goal.
                    </p>
                  )}

                  <Separator className="my-4" />

                  <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {selected.body}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                  <Inbox className="size-10 opacity-40" />
                  <p>Select a message to read the full thread.</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      <section aria-labelledby="compose-heading">
        <h2 id="compose-heading" className="font-heading text-xl font-semibold text-primary">
          Send email
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          One-to-one for sensitive account fixes; groups for broadcasts (tax reminders, campaign tips).
          Production should enforce unsubscribe links, role-appropriate copy, and dedupe across overlapping
          segments.
        </p>

        <Card className="mt-4 border-border/80">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-lg text-primary">Compose</CardTitle>
            <CardDescription>
              Choose <strong>Individual</strong> for a single address, or <strong>Group</strong> to
              target saved audiences and campaign-scoped lists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitSend} className="space-y-6">
              <div className="flex w-fit flex-wrap gap-2 rounded-lg border border-border bg-muted/30 p-0.5">
                <Button
                  type="button"
                  variant={recipientMode === "individual" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setRecipientMode("individual")}
                >
                  <User className="size-4" />
                  Individual
                </Button>
                <Button
                  type="button"
                  variant={recipientMode === "group" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setRecipientMode("group")}
                >
                  <Users className="size-4" />
                  Group / segment
                </Button>
              </div>

              {recipientMode === "individual" ? (
                <div className="space-y-2">
                  <Label htmlFor="to-one">Recipient</Label>
                  <Select
                    value={individualEmail}
                    onValueChange={(v) => setIndividualEmail(v ?? "")}
                  >
                    <SelectTrigger id="to-one" className="h-10 w-full max-w-xl">
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {recipientOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Includes sample users and campaign family leads from your mocks; production would
                    search the full directory.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>Audience segments</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {EMAIL_BROADCAST_SEGMENTS.map((seg) => (
                      <label
                        key={seg.id}
                        className="flex cursor-pointer gap-3 rounded-lg border border-border/80 bg-muted/20 p-3 has-[[data-slot=checkbox]:checked]:border-primary/40 has-[[data-slot=checkbox]:checked]:bg-primary/5"
                      >
                        <Checkbox
                          checked={segmentIds.has(seg.id)}
                          onCheckedChange={(v) => toggleSegment(seg, v === true)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="font-medium text-foreground">{seg.label}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {seg.description}
                          </span>
                          <span className="mt-1.5 flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              ~{seg.estimatedRecipients} recipients
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {seg.rolesHint}
                            </Badge>
                            {seg.campaignSlug ? (
                              <Link
                                href={`/campaigns/${seg.campaignSlug}`}
                                className="text-[10px] font-medium text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View campaign
                              </Link>
                            ) : null}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {segmentIds.size > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Estimated reach (naïve sum for this demo):{" "}
                      <strong className="text-foreground tabular-nums">{estimatedGroupReach}</strong>
                    </p>
                  ) : null}
                </div>
              )}

              <div className="grid gap-4 max-w-xl">
                <div>
                  <Label htmlFor="template">Starter template (optional)</Label>
                  <Select
                    value={templateId || "__none__"}
                    onValueChange={(v) => {
                      const next = v ?? "__none__";
                      if (next === "__none__") {
                        setTemplateId("");
                        return;
                      }
                      applyTemplate(next);
                    }}
                  >
                    <SelectTrigger id="template" className="mt-1.5 h-10 w-full">
                      <SelectValue placeholder="Blank message" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Blank message</SelectItem>
                      {COMPOSE_TEMPLATES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subj">Subject</Label>
                  <Input
                    id="subj"
                    className="mt-1.5"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject line"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  className="mt-1.5 min-h-[200px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Use {{first_name}} as a merge placeholder for production merge tags."
                />
              </div>

              {sendHint ? (
                <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                  {sendHint}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={busy}>
                  <Send className="mr-2 size-4" />
                  {busy ? "Sending…" : "Send (demo)"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Bulk email must include unsubscribe handling and Arizona disclosure rules where required.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
