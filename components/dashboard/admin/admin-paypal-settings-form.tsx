"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function SecretField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1.5">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide value" : "Show value"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

export function AdminPaypalSettingsForm() {
  const [sandboxClientId, setSandboxClientId] = useState("");
  const [sandboxSecret, setSandboxSecret] = useState("");
  const [liveClientId, setLiveClientId] = useState("");
  const [liveSecret, setLiveSecret] = useState("");
  const [webhookId, setWebhookId] = useState("");
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
        const res = await fetch("/api/admin/integrations/paypal");
        const data = (await res.json().catch(() => null)) as {
          payload?: {
            sandboxClientId?: string;
            sandboxSecret?: string;
            liveClientId?: string;
            liveSecret?: string;
            webhookId?: string;
          };
          error?: string;
        } | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Could not load PayPal settings.");
        }
        if (cancelled || !data?.payload) return;
        const p = data.payload;
        setSandboxClientId(p.sandboxClientId ?? "");
        setSandboxSecret(p.sandboxSecret ?? "");
        setLiveClientId(p.liveClientId ?? "");
        setLiveSecret(p.liveSecret ?? "");
        setWebhookId(p.webhookId ?? "");
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Could not load PayPal settings.");
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
      const res = await fetch("/api/admin/integrations/paypal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            sandboxClientId,
            sandboxSecret,
            liveClientId,
            liveSecret,
            webhookId,
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
        <CardTitle className="font-heading text-primary">PayPal API keys</CardTitle>
        <CardDescription>
          Store Test (sandbox) and Live REST credentials. Saved to the database for Super Admins
          only; use server-side code to call PayPal — never expose secrets in client bundles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-8">
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
            <h3 className="text-sm font-semibold text-primary">Test / Sandbox</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Use PayPal Developer Dashboard sandbox apps for local amounts and webhooks.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="pp-sandbox-client">Sandbox client ID</Label>
                <Input
                  id="pp-sandbox-client"
                  className="mt-1.5 font-mono text-sm"
                  value={sandboxClientId}
                  onChange={(e) => setSandboxClientId(e.target.value)}
                  placeholder="AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ"
                  autoComplete="off"
                />
              </div>
              <SecretField
                id="pp-sandbox-secret"
                label="Sandbox secret"
                value={sandboxSecret}
                onChange={setSandboxSecret}
                autoComplete="new-password"
              />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-primary">Live / Production</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Production REST app credentials — restrict to server-side use only when deployed.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="pp-live-client">Live client ID</Label>
                <Input
                  id="pp-live-client"
                  className="mt-1.5 font-mono text-sm"
                  value={liveClientId}
                  onChange={(e) => setLiveClientId(e.target.value)}
                  placeholder="AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ"
                  autoComplete="off"
                />
              </div>
              <SecretField
                id="pp-live-secret"
                label="Live secret"
                value={liveSecret}
                onChange={setLiveSecret}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pp-webhook">Webhook ID (optional)</Label>
            <Input
              id="pp-webhook"
              className="mt-1.5 font-mono text-sm"
              value={webhookId}
              onChange={(e) => setWebhookId(e.target.value)}
              placeholder="WH-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
