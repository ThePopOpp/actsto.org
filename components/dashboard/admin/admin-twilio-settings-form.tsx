"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminTwilioSettingsForm() {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [messagingServiceSid, setMessagingServiceSid] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/admin/integrations/twilio");
        const data = (await res.json().catch(() => null)) as {
          payload?: {
            accountSid?: string;
            authToken?: string;
            messagingServiceSid?: string;
          };
          error?: string;
        } | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Could not load Twilio settings.");
        }
        if (cancelled || !data?.payload) return;
        const p = data.payload;
        setAccountSid(p.accountSid ?? "");
        setAuthToken(p.authToken ?? "");
        setMessagingServiceSid(p.messagingServiceSid ?? "");
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Could not load Twilio settings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/integrations/twilio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            accountSid,
            authToken,
            messagingServiceSid,
          },
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Save failed.");
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-primary">Twilio credentials</CardTitle>
        <CardDescription>
          Account SID and Auth Token from the Twilio Console. Saved to the database for Super Admins
          only; call Twilio from server routes only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {loadError ? (
            <p className="text-sm text-destructive" role="alert">
              {loadError}
            </p>
          ) : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading saved settings…</p>
          ) : null}
          <div className={loading ? "pointer-events-none opacity-60" : undefined}>
          <div>
            <Label htmlFor="tw-account-sid">Account SID</Label>
            <Input
              id="tw-account-sid"
              className="mt-1.5 font-mono text-sm"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="tw-auth-token">Auth token</Label>
            <div className="relative mt-1.5">
              <Input
                id="tw-auth-token"
                type={showToken ? "text" : "password"}
                className="pr-10 font-mono text-sm"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Your auth token"
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken((s) => !s)}
                aria-label={showToken ? "Hide auth token" : "Show auth token"}
              >
                {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="tw-msg-service">Messaging Service SID (optional)</Label>
            <Input
              id="tw-msg-service"
              className="mt-1.5 font-mono text-sm"
              value={messagingServiceSid}
              onChange={(e) => setMessagingServiceSid(e.target.value)}
              placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              For A2P / campaign registration flows you may also store a compliance template ID later.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="submit" disabled={loading || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {saved ? (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</span>
            ) : null}
            {saveError ? (
              <span className="text-sm text-destructive" role="alert">
                {saveError}
              </span>
            ) : null}
          </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
