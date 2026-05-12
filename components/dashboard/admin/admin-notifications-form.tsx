"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GENERAL_EMAIL } from "@/lib/constants";

type Settings = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  donationReceipts: boolean;
  campaignApproved: boolean;
  campaignNeedsChanges: boolean;
  campaignMilestones: boolean;
  taxCreditReminders: boolean;
  weeklyAdminDigest: boolean;
  adminNewDonation: boolean;
  adminDonationMinimum: number;
  adminPaymentFailures: boolean;
  adminNewRegistrations: boolean;
  adminInboxSla: boolean;
  maxPerHour: number;
  batchSize: number;
  quietStart: string;
  quietEnd: string;
  defaultLocale: string;
};

type AuditRow = {
  id: string;
  channel: string;
  template: string;
  recipient: string;
  status: string;
  createdAt: string;
};

const DEFAULT_SETTINGS: Settings = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: false,
  fromName: "Arizona Christian Tuition",
  fromEmail: GENERAL_EMAIL,
  replyTo: GENERAL_EMAIL,
  donationReceipts: true,
  campaignApproved: true,
  campaignNeedsChanges: true,
  campaignMilestones: true,
  taxCreditReminders: true,
  weeklyAdminDigest: false,
  adminNewDonation: true,
  adminDonationMinimum: 500,
  adminPaymentFailures: true,
  adminNewRegistrations: true,
  adminInboxSla: true,
  maxPerHour: 500,
  batchSize: 50,
  quietStart: "21:00",
  quietEnd: "07:00",
  defaultLocale: "en-US",
};

function fmt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  }).format(new Date(value));
}

export function AdminNotificationsForm() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/notifications/settings", { cache: "no-store" })
      .then((res) => res.json() as Promise<{ settings?: Settings; audit?: AuditRow[] }>)
      .then((data) => {
        if (cancelled) return;
        setSettings({ ...DEFAULT_SETTINGS, ...(data.settings ?? {}) });
        setAudit(data.audit ?? []);
      })
      .catch(() => setNotice("Could not load notification settings."));
    return () => {
      cancelled = true;
    };
  }, []);

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice(null);
  }

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not save notification settings.");
      setNotice("Notification settings saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save notification settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-primary/25 bg-muted/15">
        <CardContent className="p-4 text-sm text-muted-foreground">
          These settings are now persisted and backed by real send logs. Twilio transport lives under{" "}
          <Link href="/dashboard/admin/sms" className="text-primary underline-offset-4 hover:underline">
            Communications
          </Link>
          .
        </CardContent>
      </Card>

      {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">{notice}</p> : null}

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Channels &amp; Sender Identity</CardTitle>
          <CardDescription>Toggle global channels and sender defaults for transactional communications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={settings.emailEnabled} onCheckedChange={(v) => patch("emailEnabled", v === true)} />
              Email
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={settings.smsEnabled} onCheckedChange={(v) => patch("smsEnabled", v === true)} />
              SMS
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={settings.pushEnabled} onCheckedChange={(v) => patch("pushEnabled", v === true)} />
              Push
            </label>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="from-name">Default From name</Label>
              <Input id="from-name" value={settings.fromName} onChange={(e) => patch("fromName", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="from-email">Default From email</Label>
              <Input id="from-email" type="email" value={settings.fromEmail} onChange={(e) => patch("fromEmail", e.target.value)} className="mt-1.5" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="reply-to">Reply-To</Label>
              <Input id="reply-to" type="email" value={settings.replyTo} onChange={(e) => patch("replyTo", e.target.value)} className="mt-1.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Triggered Messages</CardTitle>
          <CardDescription>Lifecycle and transactional notifications connected to dashboard events.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {[
            ["donationReceipts", "Donation receipts"],
            ["campaignApproved", "Campaign approved"],
            ["campaignNeedsChanges", "Campaign needs changes"],
            ["campaignMilestones", "Campaign milestones"],
            ["taxCreditReminders", "Tax credit reminders"],
            ["weeklyAdminDigest", "Weekly admin digest"],
          ].map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={Boolean(settings[key as keyof Settings])} onCheckedChange={(v) => patch(key as keyof Settings, v === true as never)} />
              {label}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Admin Alerts, Throttle &amp; Quiet Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["adminNewDonation", "New donations"],
              ["adminPaymentFailures", "Payment or webhook failures"],
              ["adminNewRegistrations", "New registrations"],
              ["adminInboxSla", "Inbox SLA warnings"],
            ].map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={Boolean(settings[key as keyof Settings])} onCheckedChange={(v) => patch(key as keyof Settings, v === true as never)} />
                {label}
              </label>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-5">
            <div>
              <Label htmlFor="don-min">Donation alert minimum</Label>
              <Input id="don-min" type="number" value={settings.adminDonationMinimum} onChange={(e) => patch("adminDonationMinimum", Number(e.target.value))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="max-hr">Max / hour</Label>
              <Input id="max-hr" type="number" value={settings.maxPerHour} onChange={(e) => patch("maxPerHour", Number(e.target.value))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="batch">Batch size</Label>
              <Input id="batch" type="number" value={settings.batchSize} onChange={(e) => patch("batchSize", Number(e.target.value))} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="quiet-start">Quiet start</Label>
              <Input id="quiet-start" type="time" value={settings.quietStart} onChange={(e) => patch("quietStart", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="quiet-end">Quiet end</Label>
              <Input id="quiet-end" type="time" value={settings.quietEnd} onChange={(e) => patch("quietEnd", e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div className="max-w-md">
            <Label>Default locale</Label>
            <Select value={settings.defaultLocale} onValueChange={(v) => patch("defaultLocale", v ?? "en-US")}>
              <SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">English (United States)</SelectItem>
                <SelectItem value="es-US">Spanish (United States)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save Notification Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Recent Send Audit</CardTitle>
          <CardDescription>Email, SMS, and in-app events from the database.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {audit.length ? audit.map((row) => (
                  <tr key={`${row.channel}-${row.id}`} className="border-b border-border/80 last:border-0">
                    <td className="px-4 py-3"><Badge variant="outline">{row.channel}</Badge></td>
                    <td className="px-4 py-3">{row.template}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.recipient}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmt(row.createdAt)}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{row.status}</Badge></td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No send audit rows yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
