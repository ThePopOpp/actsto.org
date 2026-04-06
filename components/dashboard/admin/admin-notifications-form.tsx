"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENERAL_EMAIL } from "@/lib/constants";

function SaveBar({ formId, saved }: { formId: string; saved: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <Button type="submit" form={formId}>
        Save (demo)
      </Button>
      {saved ? (
        <span className="text-sm text-emerald-600 dark:text-emerald-400">
          Saved locally — connect queue worker and template store to persist.
        </span>
      ) : null}
    </div>
  );
}

const MOCK_AUDIT: { id: string; channel: string; template: string; recipients: string; when: string; status: string }[] = [
  {
    id: "1",
    channel: "Email",
    template: "Donation receipt",
    recipients: "1 (rachel.t@…)",
    when: "Mar 29, 2026 · 4:12 PM",
    status: "Delivered",
  },
  {
    id: "2",
    channel: "Email",
    template: "Campaign approved",
    recipients: "1 (jwaters@…)",
    when: "Mar 28, 2026 · 9:01 AM",
    status: "Delivered",
  },
  {
    id: "3",
    channel: "SMS",
    template: "Donation thank-you (short)",
    recipients: "1 (+1 602…)",
    when: "Mar 27, 2026 · 2:44 PM",
    status: "Sent",
  },
];

export function AdminNotificationsForm() {
  const [emailOn, setEmailOn] = useState(true);
  const [smsOn, setSmsOn] = useState(true);
  const [pushOn, setPushOn] = useState(false);
  const [fromName, setFromName] = useState("Arizona Christian Tuition");
  const [fromEmail, setFromEmail] = useState(GENERAL_EMAIL);
  const [replyTo, setReplyTo] = useState("hello@arizonachristiantuition.com");
  const [savedChannels, setSavedChannels] = useState(false);

  const [tplReceipt, setTplReceipt] = useState(true);
  const [tplApproved, setTplApproved] = useState(true);
  const [tplRejected, setTplRejected] = useState(true);
  const [tplMilestone, setTplMilestone] = useState(true);
  const [tplTaxReminder, setTplTaxReminder] = useState(true);
  const [tplWeeklyAdmin, setTplWeeklyAdmin] = useState(false);
  const [savedTriggered, setSavedTriggered] = useState(false);

  const [alertNewDonation, setAlertNewDonation] = useState(true);
  const [alertDonationMin, setAlertDonationMin] = useState("500");
  const [alertFailedPay, setAlertFailedPay] = useState(true);
  const [alertNewReg, setAlertNewReg] = useState(true);
  const [alertInboxSla, setAlertInboxSla] = useState(true);
  const [savedAdmin, setSavedAdmin] = useState(false);

  const [maxPerHour, setMaxPerHour] = useState("500");
  const [batchSize, setBatchSize] = useState("50");
  const [quietStart, setQuietStart] = useState("21:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [savedThrottle, setSavedThrottle] = useState(false);

  const [defaultLocale, setDefaultLocale] = useState("en-US");
  const [savedPrefs, setSavedPrefs] = useState(false);

  function flash(setter: (v: boolean) => void) {
    setter(true);
    window.setTimeout(() => setter(false), 2200);
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-primary/25 bg-muted/15">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Transport credentials live under{" "}
          <Link href="/dashboard/admin/credentials" className="text-primary underline-offset-4 hover:underline">
            API & credentials
          </Link>{" "}
          (Resend/SMTP) and{" "}
          <Link href="/dashboard/admin/sms" className="text-primary underline-offset-4 hover:underline">
            SMS · Twilio
          </Link>
          . Here you define what sends, to whom, and how fast.
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Channels &amp; sender identity</CardTitle>
          <CardDescription>
            Toggle channels globally; per-user unsubscribe still required for marketing content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-notify-channels"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedChannels);
            }}
          >
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={emailOn} onCheckedChange={(v) => setEmailOn(v === true)} />
                Email (Resend / SMTP)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={smsOn} onCheckedChange={(v) => setSmsOn(v === true)} />
                SMS (Twilio)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={pushOn} onCheckedChange={(v) => setPushOn(v === true)} />
                Push (future — PWA / mobile)
              </label>
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="from-name">Default From name</Label>
                <Input
                  id="from-name"
                  className="mt-1.5"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="from-email">Default From email</Label>
                <Input
                  id="from-email"
                  type="email"
                  className="mt-1.5"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="reply-to">Reply-To (support inbox)</Label>
                <Input
                  id="reply-to"
                  type="email"
                  className="mt-1.5"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                />
              </div>
            </div>
          </form>
          <SaveBar formId="form-notify-channels" saved={savedChannels} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Triggered messages (supporters)</CardTitle>
          <CardDescription>
            Transactional and lifecycle emails; Arizona disclosures can be merged per template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-notify-triggered"
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedTriggered);
            }}
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={tplReceipt} onCheckedChange={(v) => setTplReceipt(v === true)} />
              Donation received — receipt &amp; tax wording
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={tplApproved} onCheckedChange={(v) => setTplApproved(v === true)} />
              Campaign approved — share link &amp; tips
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={tplRejected} onCheckedChange={(v) => setTplRejected(v === true)} />
              Campaign needs changes / rejected
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={tplMilestone} onCheckedChange={(v) => setTplMilestone(v === true)} />
              Campaign milestones (25% · 50% · 75% · goal)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={tplTaxReminder} onCheckedChange={(v) => setTplTaxReminder(v === true)} />
              Seasonal Arizona tax-credit reminder (opt-in segment only)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={tplWeeklyAdmin} onCheckedChange={(v) => setTplWeeklyAdmin(v === true)} />
              Weekly digest to campaign owners (open tasks, new donors)
            </label>
          </form>
          <SaveBar formId="form-notify-triggered" saved={savedTriggered} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Admin alerts</CardTitle>
          <CardDescription>
            Internal email or Slack webhook (hook configured in credentials later).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-notify-admin"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedAdmin);
            }}
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={alertNewDonation} onCheckedChange={(v) => setAlertNewDonation(v === true)} />
              Notify on new donations at or above threshold
            </label>
            <div className="max-w-xs">
              <Label htmlFor="don-min">Minimum gift ($) for instant alert</Label>
              <Input
                id="don-min"
                type="number"
                min={0}
                className="mt-1.5"
                value={alertDonationMin}
                onChange={(e) => setAlertDonationMin(e.target.value)}
                disabled={!alertNewDonation}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={alertFailedPay} onCheckedChange={(v) => setAlertFailedPay(v === true)} />
              Payment / webhook failures (PayPal)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={alertNewReg} onCheckedChange={(v) => setAlertNewReg(v === true)} />
              New registrations (by role — filter in worker)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={alertInboxSla} onCheckedChange={(v) => setAlertInboxSla(v === true)} />
              Inbox SLA warning unanswered threads (24h)
            </label>
          </form>
          <SaveBar formId="form-notify-admin" saved={savedAdmin} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Throttle &amp; quiet hours</CardTitle>
          <CardDescription>
            Protect domain reputation; transactional receipts may bypass quiet hours in production.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-notify-throttle"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedThrottle);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="max-hr">Max marketing emails / hour (account-wide)</Label>
                <Input
                  id="max-hr"
                  type="number"
                  min={1}
                  className="mt-1.5"
                  value={maxPerHour}
                  onChange={(e) => setMaxPerHour(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="batch">Batch size per cron tick</Label>
                <Input
                  id="batch"
                  type="number"
                  min={1}
                  className="mt-1.5"
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="q-start">Quiet hours start (local)</Label>
                <Input
                  id="q-start"
                  type="time"
                  className="mt-1.5"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="q-end">Quiet hours end (local)</Label>
                <Input
                  id="q-end"
                  type="time"
                  className="mt-1.5"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use Arizona (America/Phoenix) as default timezone for families unless profile overrides exist.
            </p>
          </form>
          <SaveBar formId="form-notify-throttle" saved={savedThrottle} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Template &amp; locale defaults</CardTitle>
          <CardDescription>
            Rich HTML editor and FluentCRM sync can plug in here later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-notify-pref"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedPrefs);
            }}
          >
            <div className="max-w-md">
              <Label htmlFor="locale">Default locale for merge tags &amp; dates</Label>
              <Select value={defaultLocale} onValueChange={(v) => setDefaultLocale(v ?? "en-US")}>
                <SelectTrigger id="locale" className="mt-1.5 h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (United States)</SelectItem>
                  <SelectItem value="es-US">Spanish (United States)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" size="sm" disabled>
              Open template library (coming soon)
            </Button>
          </form>
          <SaveBar formId="form-notify-pref" saved={savedPrefs} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Recent send audit (sample)</CardTitle>
          <CardDescription>
            Immutable log in production; helps troubleshoot “donor didn’t get receipt” tickets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Recipients</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_AUDIT.map((row) => (
                  <tr key={row.id} className="border-b border-border/80 last:border-0">
                    <td className="px-4 py-3">
                      <Badge variant={row.channel === "SMS" ? "outline" : "secondary"}>{row.channel}</Badge>
                    </td>
                    <td className="px-4 py-3">{row.template}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.recipients}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{row.when}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400">
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
