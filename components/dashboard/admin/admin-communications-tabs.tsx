"use client";

import { useEffect, useState } from "react";
import { BellRing, FileText, MessageSquare, Send, Upload } from "lucide-react";

import { AdminPageTabs, type AdminPageTab } from "@/components/dashboard/admin/admin-page-tabs";
import { AdminTwilioSettingsForm } from "@/components/dashboard/admin/admin-twilio-settings-form";
import { EmailTemplatesPanel } from "@/components/dashboard/admin/email-templates-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CommunicationsTab =
  | "messages"
  | "send"
  | "bulk"
  | "notifications"
  | "email"
  | "templates"
  | "credentials";
type SmsLogRow = {
  id: string;
  direction: string;
  fromPhone?: string | null;
  toPhone: string;
  contactName?: string | null;
  contactEmail?: string | null;
  roleType?: string | null;
  campaignTitle?: string | null;
  campaignSlug?: string | null;
  matchedPhone?: string | null;
  contactSource?: string | null;
  message: string;
  status?: string | null;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
};
type SmsTemplate = { id: string; title: string; message: string; category?: string | null };
type BroadcastRow = {
  id: string;
  title: string;
  body: string;
  url?: string | null;
  audience: string;
  sentByEmail?: string | null;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
};
type PushState = {
  configured: boolean;
  subscriberCount: number;
  signedInCount: number;
  broadcasts: BroadcastRow[];
};
type Runtime = {
  ready: boolean;
  hasAccountSid: boolean;
  hasAuthToken: boolean;
  hasPhoneNumber: boolean;
  hasMessagingServiceSid: boolean;
  sender: string;
};

const tabs: AdminPageTab<CommunicationsTab>[] = [
  { id: "messages", label: "SMS Messages" },
  { id: "send", label: "Send SMS" },
  { id: "bulk", label: "Bulk SMS" },
  { id: "notifications", label: "Notifications" },
  { id: "email", label: "Email Templates" },
  { id: "templates", label: "Templates" },
  { id: "credentials", label: "Credentials" },
];

function fmtDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  }).format(new Date(value));
}

function roleLabel(value?: string | null) {
  switch (value) {
    case "parent":
      return "Parent";
    case "student":
      return "Student";
    case "individual_donor":
    case "donor_individual":
      return "Individual Donor";
    case "business_donor":
    case "donor_business":
      return "Business Donor";
    case "super_admin":
      return "Super Admin";
    case "school":
      return "School";
    default:
      return value ?? null;
  }
}

export function AdminCommunicationsTabs() {
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [logs, setLogs] = useState<SmsLogRow[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [bulkContacts, setBulkContacts] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Web Push broadcast state.
  const [push, setPush] = useState<PushState | null>(null);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("");
  const [pushAudience, setPushAudience] = useState<"all" | "signed_in">("all");

  async function loadSms() {
    const res = await fetch("/api/admin/sms", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { runtime?: Runtime; logs?: SmsLogRow[] } | null;
    if (res.ok) {
      setRuntime(data?.runtime ?? null);
      setLogs(data?.logs ?? []);
    }
  }

  async function loadTemplates() {
    const res = await fetch("/api/admin/sms/templates", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { templates?: SmsTemplate[] } | null;
    if (res.ok) setTemplates(data?.templates ?? []);
  }

  async function loadPush() {
    const res = await fetch("/api/admin/notifications/broadcast", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as PushState | null;
    if (res.ok && data) setPush(data);
  }

  useEffect(() => {
    void loadSms();
    void loadTemplates();
    void loadPush();
  }, []);

  async function sendBroadcast() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pushTitle,
          body: pushBody,
          url: pushUrl,
          audience: pushAudience,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        success?: number;
        failure?: number;
        recipientCount?: number;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not send notification.");
      setNotice(
        `Notification sent to ${data?.success ?? 0} of ${data?.recipientCount ?? 0} device(s). Failed ${data?.failure ?? 0}.`,
      );
      setPushTitle("");
      setPushBody("");
      setPushUrl("");
      await loadPush();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send notification.");
    } finally {
      setBusy(false);
    }
  }

  async function sendSms(payload: { to?: string; contacts?: string; message: string; bulk?: boolean }) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; sent?: number; failed?: number } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not send SMS.");
      setNotice(`Sent ${data?.sent ?? 0} message(s). Failed ${data?.failed ?? 0}.`);
      await loadSms();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send SMS.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/sms/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: templateTitle, message: templateMessage }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not save template.");
      setTemplateTitle("");
      setTemplateMessage("");
      setNotice("Template saved.");
      await loadTemplates();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save template.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-dashed border-primary/25 bg-muted/15">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-muted-foreground">
            Twilio status:{" "}
            <strong className={runtime?.ready ? "text-emerald-600" : "text-destructive"}>
              {runtime?.ready ? "Ready" : "Needs configuration"}
            </strong>
            {runtime?.sender ? ` · Sender: ${runtime.sender}` : ""}
          </span>
          <span className="text-xs text-muted-foreground">
            Env/database credentials are read server-side only; tokens are never sent to Twilio from the browser.
          </span>
        </CardContent>
      </Card>
      {notice ? (
        <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">{notice}</p>
      ) : null}

      <AdminPageTabs tabs={tabs} initialTab="messages">
        {(activeTab) => (
          <>
            {activeTab === "messages" ? (
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-primary">
                    <MessageSquare className="size-5" />
                    SMS messages
                  </CardTitle>
                  <CardDescription>Live Twilio send, delivery, error, and inbound log history.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {logs.length ? logs.map((row) => (
                    <div key={row.id} className="rounded-lg border border-border/80 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {row.contactName ?? (row.direction === "inbound" ? row.fromPhone : row.toPhone)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {row.direction} · {fmtDate(row.createdAt)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {roleLabel(row.roleType) ? <Badge variant="secondary">{roleLabel(row.roleType)}</Badge> : null}
                            {row.campaignTitle ? <Badge variant="outline">{row.campaignTitle}</Badge> : null}
                            {row.contactSource ? <Badge variant="outline">{row.contactSource}</Badge> : null}
                          </div>
                        </div>
                        <Badge variant={row.status === "failed" ? "destructive" : "outline"}>
                          {row.status ?? "queued"}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm text-foreground">{row.message}</p>
                      {row.errorMessage ? <p className="mt-2 text-xs text-destructive">{row.errorMessage}</p> : null}
                    </div>
                  )) : (
                    <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                      No SMS messages have been logged yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "send" ? (
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-primary">
                    <Send className="size-5" />
                    Send SMS
                  </CardTitle>
                  <CardDescription>Compose a one-to-one SMS through the server-side Twilio route.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    className="max-w-2xl space-y-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void sendSms({ to, message });
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="sms-to">Recipient phone</Label>
                      <Input id="sms-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="(602) 555-0100" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sms-body">Message</Label>
                      <Textarea id="sms-body" value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[160px]" />
                    </div>
                    <Button type="submit" disabled={busy || !runtime?.ready}>
                      <Send className="mr-2 size-4" />
                      Send SMS
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "bulk" ? (
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-primary">
                    <Upload className="size-5" />
                    Bulk SMS
                  </CardTitle>
                  <CardDescription>Paste comma-separated contacts. Sends are capped at 50 recipients per request.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    className="space-y-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void sendSms({ contacts: bulkContacts, message: bulkMessage, bulk: true });
                    }}
                  >
                    <div className="max-w-3xl space-y-2">
                      <Label htmlFor="bulk-contacts">Comma-separated contacts</Label>
                      <Textarea id="bulk-contacts" value={bulkContacts} onChange={(e) => setBulkContacts(e.target.value)} className="min-h-[120px]" />
                    </div>
                    <div className="max-w-3xl space-y-2">
                      <Label htmlFor="bulk-message">Bulk message</Label>
                      <Textarea id="bulk-message" value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} className="min-h-[160px]" />
                    </div>
                    <Button type="submit" disabled={busy || !runtime?.ready}>Send Bulk SMS</Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "notifications" ? (
              <div className="space-y-4">
                <Card className="border-dashed border-primary/25 bg-muted/15">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <span className="text-muted-foreground">
                      Web Push:{" "}
                      <strong className={push?.configured ? "text-emerald-600" : "text-destructive"}>
                        {push?.configured ? "Ready" : "Needs VAPID keys"}
                      </strong>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {push?.subscriberCount ?? 0} subscribed device(s) · {push?.signedInCount ?? 0}{" "}
                      signed-in
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-border/80">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-heading text-primary">
                      <BellRing className="size-5" />
                      Send app notification
                    </CardTitle>
                    <CardDescription>
                      Push a site-wide notification to every installed app / subscribed browser.
                      Delivered instantly, even when the site is closed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      className="max-w-2xl space-y-5"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void sendBroadcast();
                      }}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="push-title">Title</Label>
                        <Input
                          id="push-title"
                          value={pushTitle}
                          onChange={(e) => setPushTitle(e.target.value)}
                          maxLength={120}
                          placeholder="A message from ACTSTO"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="push-body">Message</Label>
                        <Textarea
                          id="push-body"
                          value={pushBody}
                          onChange={(e) => setPushBody(e.target.value)}
                          maxLength={480}
                          className="min-h-[120px]"
                          placeholder="What do you want supporters to know?"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="push-url">Link (opened on tap)</Label>
                          <Input
                            id="push-url"
                            value={pushUrl}
                            onChange={(e) => setPushUrl(e.target.value)}
                            placeholder="/campaigns"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="push-audience">Audience</Label>
                          <select
                            id="push-audience"
                            value={pushAudience}
                            onChange={(e) =>
                              setPushAudience(e.target.value === "signed_in" ? "signed_in" : "all")
                            }
                            className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            <option value="all">All subscribers</option>
                            <option value="signed_in">Signed-in users only</option>
                          </select>
                        </div>
                      </div>
                      <Button type="submit" disabled={busy || !push?.configured || !pushTitle.trim()}>
                        <BellRing className="mr-2 size-4" />
                        {busy ? "Sending…" : "Send Notification"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border-border/80">
                  <CardHeader>
                    <CardTitle className="font-heading text-primary">Recent broadcasts</CardTitle>
                    <CardDescription>Delivery history and reach for past notifications.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {push?.broadcasts.length ? (
                      push.broadcasts.map((b) => (
                        <div key={b.id} className="rounded-lg border border-border/80 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{b.title}</p>
                              <p className="text-sm text-muted-foreground">{fmtDate(b.createdAt)}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="secondary">
                                  {b.audience === "signed_in" ? "Signed-in" : "All"}
                                </Badge>
                                {b.sentByEmail ? <Badge variant="outline">{b.sentByEmail}</Badge> : null}
                              </div>
                            </div>
                            <Badge variant={b.failureCount > 0 ? "destructive" : "outline"}>
                              {b.successCount}/{b.recipientCount} delivered
                            </Badge>
                          </div>
                          {b.body ? <p className="mt-3 text-sm text-foreground">{b.body}</p> : null}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                        No notifications have been sent yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activeTab === "email" ? <EmailTemplatesPanel /> : null}

            {activeTab === "templates" ? (
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-primary">
                    <FileText className="size-5" />
                    SMS templates
                  </CardTitle>
                  <CardDescription>Reusable SMS copy stored in Supabase via Prisma.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className="rounded-lg border border-border/80 p-4 text-left hover:bg-muted/30"
                        onClick={() => setMessage(template.message)}
                      >
                        <p className="font-medium text-foreground">{template.title}</p>
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{template.message}</p>
                      </button>
                    ))}
                  </div>
                  <form
                    className="max-w-3xl space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveTemplate();
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="template-title">Template title</Label>
                      <Input id="template-title" value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-message">Template message</Label>
                      <Textarea id="template-message" value={templateMessage} onChange={(e) => setTemplateMessage(e.target.value)} className="min-h-[140px]" />
                    </div>
                    <Button type="submit" disabled={busy}>Save Template</Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "credentials" ? <AdminTwilioSettingsForm /> : null}
          </>
        )}
      </AdminPageTabs>
    </div>
  );
}
