"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { PushOptIn } from "@/components/pwa/push-opt-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  EMAIL_CATALOG,
  EMAIL_PREFERENCE_GROUPS,
  type EmailPreferenceKey,
} from "@/lib/email/catalog";

type Preferences = {
  emailOptIn: boolean;
  smsOptIn: boolean;
  transactionalEmailEnabled: boolean;
} & Record<EmailPreferenceKey, boolean>;

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
  campaignAlertsEnabled: true,
  featuredCampaignsEnabled: true,
  productUpdatesEnabled: true,
  scholarshipUpdatesEnabled: true,
};

/** The emails a given switch controls, so the choice isn't abstract. */
const EXAMPLES: Record<EmailPreferenceKey, string> = EMAIL_PREFERENCE_GROUPS.reduce(
  (acc, group) => {
    const names = EMAIL_CATALOG.filter((e) => e.preference === group.key)
      .slice(0, 3)
      .map((e) => e.name);
    acc[group.key] = names.join(" · ");
    return acc;
  },
  {} as Record<EmailPreferenceKey, string>,
);

/** Required emails, listed so people can see what a switch will never suppress. */
const REQUIRED_EXAMPLES = EMAIL_CATALOG.filter((e) => e.preference === null)
  .slice(0, 6)
  .map((e) => e.name);

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
    // The setState calls happen after an await, inside the promise — not
    // synchronously in this body — so the cascading-render warning doesn't
    // apply. The rule can't see through the async call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          <CardTitle className="font-heading text-lg text-primary">App Push Notifications</CardTitle>
          <CardDescription>
            Get real-time alerts from ACTSTO on this device — even when the site is closed. Install
            the app for the best experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushOptIn />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">How we reach you</CardTitle>
          <CardDescription>
            Turning email off here stops everything optional. Receipts, tax documents and account
            security messages still send — those aren&rsquo;t marketing, and there&rsquo;s no version of
            this service that withholds the document proving your donation.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60 p-0">
          {([
            { key: "emailOptIn" as const, label: "Email", hint: "The master switch for optional email." },
            { key: "smsOptIn" as const, label: "SMS", hint: "Text messages. Standard rates apply." },
          ]).map((row) => (
            <label key={row.key} className="flex cursor-pointer items-start justify-between gap-4 px-4 py-4">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{row.label}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{row.hint}</span>
              </span>
              <Checkbox
                checked={preferences[row.key]}
                onCheckedChange={(v) =>
                  setPreferences((current) => ({ ...current, [row.key]: v === true }))
                }
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Email preferences</CardTitle>
          <CardDescription>
            Choose what&rsquo;s worth an email. Each of these is off or on independently.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60 p-0">
          {EMAIL_PREFERENCE_GROUPS.map((group) => (
            <label
              key={group.key}
              className="flex cursor-pointer items-start justify-between gap-4 px-4 py-4"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{group.label}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{group.description}</span>
                {EXAMPLES[group.key] ? (
                  <span className="mt-1 block text-xs text-muted-foreground/80">
                    Includes: {EXAMPLES[group.key]}
                  </span>
                ) : null}
              </span>
              <Checkbox
                // Disabled rather than hidden when email is off entirely: seeing
                // why a switch does nothing beats the switch disappearing.
                disabled={!preferences.emailOptIn}
                checked={preferences[group.key] && preferences.emailOptIn}
                onCheckedChange={(v) =>
                  setPreferences((current) => ({ ...current, [group.key]: v === true }))
                }
              />
            </label>
          ))}

          <div className="space-y-3 px-4 py-4">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Always sent:</span>{" "}
              {REQUIRED_EXAMPLES.join(" · ")} and other account and tax messages.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save preferences"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  const next = { ...preferences };
                  for (const group of EMAIL_PREFERENCE_GROUPS) next[group.key] = false;
                  setPreferences(next);
                  void save(next);
                }}
              >
                Turn off all optional email
              </Button>
            </div>
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
