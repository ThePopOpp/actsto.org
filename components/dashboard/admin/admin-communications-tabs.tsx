"use client";

import { useState } from "react";
import { MessageSquare, Send, Upload, FileText } from "lucide-react";

import { AdminPageTabs, type AdminPageTab } from "@/components/dashboard/admin/admin-page-tabs";
import { AdminTwilioSettingsForm } from "@/components/dashboard/admin/admin-twilio-settings-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CommunicationsTab = "messages" | "send" | "bulk" | "templates" | "credentials";

const tabs: AdminPageTab<CommunicationsTab>[] = [
  { id: "messages", label: "SMS Messages" },
  { id: "send", label: "Send SMS" },
  { id: "bulk", label: "Bulk SMS" },
  { id: "templates", label: "Templates" },
  { id: "credentials", label: "Credentials" },
];

const sampleMessages = [
  {
    from: "(602) 555-0134",
    name: "Jeremy Waters",
    body: "Can you confirm our campaign link before I send it to grandparents?",
    when: "Today · 7:08 PM",
    status: "Unread",
  },
  {
    from: "(480) 555-0177",
    name: "Leavitt Family",
    body: "STOP",
    when: "Yesterday · 4:22 PM",
    status: "Opt-out",
  },
  {
    from: "(623) 555-0189",
    name: "Donor contact",
    body: "Thank you, I received the receipt.",
    when: "May 7 · 11:15 AM",
    status: "Read",
  },
];

const templateSamples = [
  "Campaign milestone thank-you",
  "Tax credit reminder",
  "Receipt follow-up",
  "Parent campaign launch",
];

export function AdminCommunicationsTabs() {
  const [sendHint, setSendHint] = useState<string | null>(null);
  const [bulkHint, setBulkHint] = useState<string | null>(null);
  const [templateHint, setTemplateHint] = useState<string | null>(null);

  return (
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
                <CardDescription>
                  Inbox-style SMS review. This is ready for Twilio inbound message and delivery log wiring.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sampleMessages.map((message) => (
                  <div key={`${message.from}-${message.when}`} className="rounded-lg border border-border/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{message.name}</p>
                        <p className="text-sm tabular-nums text-muted-foreground">{message.from}</p>
                      </div>
                      <Badge variant={message.status === "Unread" ? "default" : "outline"}>
                        {message.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-foreground">{message.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{message.when}</p>
                  </div>
                ))}
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
                <CardDescription>
                  Compose a one-to-one SMS. Server-side Twilio sending and consent checks still need to be wired.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="max-w-2xl space-y-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSendHint("Demo only: connect a server-side Twilio send route before sending live SMS.");
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="sms-to">Recipient phone</Label>
                    <Input id="sms-to" placeholder="(602) 555-0100" autoComplete="off" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-body">Message</Label>
                    <Textarea id="sms-body" className="min-h-[160px]" placeholder="Write your message..." />
                  </div>
                  {sendHint ? <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">{sendHint}</p> : null}
                  <Button type="submit">
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
                <CardDescription>
                  Upload contacts or paste comma-separated phone numbers. Production must dedupe, check opt-in, and respect quiet hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setBulkHint("Demo only: bulk jobs need queueing, opt-in validation, and Twilio rate limiting.");
                  }}
                >
                  <div className="max-w-3xl space-y-2">
                    <Label htmlFor="bulk-contacts">Comma-separated contacts</Label>
                    <Textarea
                      id="bulk-contacts"
                      className="min-h-[120px]"
                      placeholder="6025550100, 4805550101, 6235550102"
                    />
                  </div>
                  <div className="max-w-lg space-y-2">
                    <Label htmlFor="bulk-upload">Upload CSV</Label>
                    <Input id="bulk-upload" type="file" accept=".csv,text/csv" />
                  </div>
                  <div className="max-w-3xl space-y-2">
                    <Label htmlFor="bulk-message">Bulk message</Label>
                    <Textarea id="bulk-message" className="min-h-[160px]" placeholder="Write your bulk message..." />
                  </div>
                  {bulkHint ? <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">{bulkHint}</p> : null}
                  <Button type="submit">Prepare Bulk SMS</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "templates" ? (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-primary">
                  <FileText className="size-5" />
                  SMS templates
                </CardTitle>
                <CardDescription>
                  Draft reusable SMS copy. Template persistence can later move to a database-backed table.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {templateSamples.map((template) => (
                    <div key={template} className="rounded-lg border border-border/80 p-4">
                      <p className="font-medium text-foreground">{template}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Draft template placeholder. Wire to SMS template storage before production use.
                      </p>
                    </div>
                  ))}
                </div>
                <form
                  className="max-w-3xl space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setTemplateHint("Demo only: save templates to a database table before enabling live use.");
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="template-title">Template title</Label>
                    <Input id="template-title" placeholder="Campaign launch reminder" autoComplete="off" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-message">Template message</Label>
                    <Textarea id="template-message" className="min-h-[140px]" placeholder="Hi {{first_name}}, ..." />
                  </div>
                  {templateHint ? <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">{templateHint}</p> : null}
                  <Button type="submit">Save Template</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "credentials" ? <AdminTwilioSettingsForm /> : null}
        </>
      )}
    </AdminPageTabs>
  );
}
