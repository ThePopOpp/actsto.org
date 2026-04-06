"use client";

import { useState } from "react";
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

  function saveDemo(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-primary">PayPal API keys</CardTitle>
        <CardDescription>
          Store Test (sandbox) and Live REST credentials. Wire this form to your secrets vault or
          database — values stay in the browser until you connect a backend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={saveDemo} className="space-y-8">
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
            <Button type="submit">Save (demo)</Button>
            {saved ? (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved locally (UI only).</span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
