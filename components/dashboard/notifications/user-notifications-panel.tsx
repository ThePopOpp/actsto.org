"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

type Preferences = {
  emailOptIn: boolean;
  smsOptIn: boolean;
  transactionalEmailEnabled: boolean;
  marketingEmailEnabled: boolean;
  donationUpdatesEnabled: boolean;
  campaignUpdatesEnabled: boolean;
};

type NotificationRow = {
  id: string;
  title: string;
  message?: string | null;
  notificationType?: string | null;
  readAt?: string | null;
  actionUrl?: string | null;
  createdAt: string;
};

const DEFAULT_PREFS: Preferences = {
  emailOptIn: true,
  smsOptIn: false,
  transactionalEmailEnabled: true,
  marketingEmailEnabled: false,
  donationUpdatesEnabled: true,
  campaignUpdatesEnabled: true,
};

const labels: { key: keyof Preferences; label: string }[] = [
  { key: "transactionalEmailEnabled", label: "Transactional email: receipts, account, and tax documents" },
  { key: "emailOptIn", label: "Email notifications" },
  { key: "smsOptIn", label: "SMS notifications" },
  { key: "donationUpdatesEnabled", label: "Donation and receipt updates" },
  { key: "campaignUpdatesEnabled", label: "Campaign updates" },
  { key: "marketingEmailEnabled", label: "Mission updates and reminders" },
];

function fmt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  }).format(new Date(value));
}

export function UserNotificationsPanel() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFS);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      preferences?: Preferences;
      notifications?: NotificationRow[];
    } | null;
    if (res.ok) {
      setPreferences({ ...DEFAULT_PREFS, ...(data?.preferences ?? {}) });
      setNotifications(data?.notifications ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(next = preferences) {
    setSaving(true);
    setNotice(null);
    const res = await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: next }),
    });
    setSaving(false);
    setNotice(res.ok ? "Notification preferences saved." : "Could not save notification preferences.");
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      {notice ? <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">{notice}</p> : null}
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/60 p-0">
          {labels.map((p) => (
            <label key={p.key} className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{p.label}</span>
              </div>
              <Checkbox
                checked={preferences[p.key]}
                onCheckedChange={(v) =>
                  setPreferences((current) => ({ ...current, [p.key]: v === true }))
                }
              />
            </label>
          ))}
          <div className="px-4 py-4">
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg text-primary">Recent Notifications</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length ? notifications.map((row) => (
            <div key={row.id} className="rounded-lg border border-border/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium text-foreground">{row.title}</p>
                <span className="text-xs text-muted-foreground">{fmt(row.createdAt)}</span>
              </div>
              {row.message ? <p className="mt-2 text-sm text-muted-foreground">{row.message}</p> : null}
              {!row.readAt ? <p className="mt-2 text-xs font-semibold text-primary">Unread</p> : null}
            </div>
          )) : (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No dashboard notifications yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
