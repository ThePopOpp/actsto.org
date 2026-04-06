"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
function SecretField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = "new-password",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
          placeholder={placeholder}
          className="pr-10 font-mono text-sm"
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

function SaveRow({ saved, id }: { id: string; saved: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <Button type="submit" form={id}>
        Save (demo)
      </Button>
      {saved ? (
        <span className="text-sm text-emerald-600 dark:text-emerald-400">
          Saved locally — connect to your vault or env injection.
        </span>
      ) : null}
    </div>
  );
}

export function AdminApiCredentialsForm() {
  const [fluentBaseUrl, setFluentBaseUrl] = useState("");
  const [fluentUser, setFluentUser] = useState("");
  const [fluentAppPass, setFluentAppPass] = useState("");
  const [savedFluent, setSavedFluent] = useState(false);

  const [resendKey, setResendKey] = useState("");
  const [emailFrom, setEmailFrom] = useState("hello@arizonachristiantuition.com");
  const [emailFromName, setEmailFromName] = useState("Arizona Christian Tuition");
  const [savedEmail, setSavedEmail] = useState(false);

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpTls, setSmtpTls] = useState(true);
  const [savedSmtp, setSavedSmtp] = useState(false);

  const [webhookSecret, setWebhookSecret] = useState("");
  const [internalCronToken, setInternalCronToken] = useState("");
  const [savedHooks, setSavedHooks] = useState(false);

  const [mapsKey, setMapsKey] = useState("");
  const [recaptchaSite, setRecaptchaSite] = useState("");
  const [recaptchaSecret, setRecaptchaSecret] = useState("");
  const [savedPublic, setSavedPublic] = useState(false);

  function flash(setter: (v: boolean) => void) {
    setter(true);
    window.setTimeout(() => setter(false), 2200);
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-primary/25 bg-muted/15">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">PayPal</strong> and <strong className="text-foreground">Twilio</strong>{" "}
          live on{" "}
          <Link href="/dashboard/admin/billing" className="text-primary underline-offset-4 hover:underline">
            Billing · PayPal
          </Link>{" "}
          and{" "}
          <Link href="/dashboard/admin/sms" className="text-primary underline-offset-4 hover:underline">
            SMS · Twilio
          </Link>
          . Use this page for CRM, email transport, webhooks, and auxiliary API keys.
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">FluentCRM (WordPress REST)</CardTitle>
          <CardDescription>
            REST base and application credentials for syncing contacts, tags, and automation — store
            only in server environment or a secrets manager in production.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-fluent"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedFluent);
            }}
          >
            <div>
              <Label htmlFor="fluent-base">WordPress site base URL</Label>
              <Input
                id="fluent-base"
                className="mt-1.5 font-mono text-sm"
                value={fluentBaseUrl}
                onChange={(e) => setFluentBaseUrl(e.target.value)}
                placeholder="https://arizonachristiantuition.com"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="fluent-user">API user (WordPress username)</Label>
                <Input
                  id="fluent-user"
                  className="mt-1.5"
                  value={fluentUser}
                  onChange={(e) => setFluentUser(e.target.value)}
                  placeholder="act_integration"
                  autoComplete="off"
                />
              </div>
              <SecretField
                id="fluent-pass"
                label="Application password"
                value={fluentAppPass}
                onChange={setFluentAppPass}
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
              />
            </div>
          </form>
          <SaveRow id="form-fluent" saved={savedFluent} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Transactional email (Resend)</CardTitle>
          <CardDescription>
            API key for programmatic mail (receipts, admin alerts). Bounded sending domain must be
            verified in Resend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-resend"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedEmail);
            }}
          >
            <SecretField
              id="resend-key"
              label="Resend API key"
              value={resendKey}
              onChange={setResendKey}
              placeholder="re_xxxxxxxx"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="email-from">Default From email</Label>
                <Input
                  id="email-from"
                  type="email"
                  className="mt-1.5"
                  value={emailFrom}
                  onChange={(e) => setEmailFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email-from-name">Default From name</Label>
                <Input
                  id="email-from-name"
                  className="mt-1.5"
                  value={emailFromName}
                  onChange={(e) => setEmailFromName(e.target.value)}
                />
              </div>
            </div>
          </form>
          <SaveRow id="form-resend" saved={savedEmail} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">SMTP fallback</CardTitle>
          <CardDescription>
            Optional relay if you are not using Resend — many hosts expose SMTP on submission ports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-smtp"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedSmtp);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="smtp-host">Host</Label>
                <Input
                  id="smtp-host"
                  className="mt-1.5 font-mono text-sm"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  className="mt-1.5 font-mono text-sm"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="smtp-user">Username</Label>
                <Input
                  id="smtp-user"
                  className="mt-1.5"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <SecretField
                id="smtp-pass"
                label="Password"
                value={smtpPass}
                onChange={setSmtpPass}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={smtpTls} onCheckedChange={(v) => setSmtpTls(v === true)} />
              Use TLS / STARTTLS (recommended)
            </label>
          </form>
          <SaveRow id="form-smtp" saved={savedSmtp} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Webhooks & internal jobs</CardTitle>
          <CardDescription>
            Verify inbound payloads (PayPal, Twilio status callbacks, custom integrations) and
            protect scheduled job endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-hooks"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedHooks);
            }}
          >
            <SecretField
              id="wh-secret"
              label="Shared webhook signing secret (HMAC)"
              value={webhookSecret}
              onChange={setWebhookSecret}
              placeholder="whsec_… or random high-entropy string"
            />
            <SecretField
              id="cron-token"
              label="Internal cron / worker bearer token"
              value={internalCronToken}
              onChange={setInternalCronToken}
              placeholder="Bearer token for /api/jobs/*"
            />
            <p className="text-xs text-muted-foreground">
              In production, prefer per-provider secrets (see PayPal webhook ID on the billing page)
              plus this shared fallback only where a single verifier is appropriate.
            </p>
          </form>
          <SaveRow id="form-hooks" saved={savedHooks} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Public & bot protection</CardTitle>
          <CardDescription>
            Keys that may appear in client bundles must use <strong>restricted</strong> referrer or
            HTTP referrer locks where the provider allows it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-public"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedPublic);
            }}
          >
            <div>
              <Label htmlFor="maps-key">Google Maps JavaScript API key (optional)</Label>
              <Input
                id="maps-key"
                className="mt-1.5 font-mono text-sm"
                value={mapsKey}
                onChange={(e) => setMapsKey(e.target.value)}
                placeholder="AIza…"
                autoComplete="off"
              />
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="rc-site">reCAPTCHA v3 site key</Label>
                <Input
                  id="rc-site"
                  className="mt-1.5 font-mono text-sm"
                  value={recaptchaSite}
                  onChange={(e) => setRecaptchaSite(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <SecretField
                id="rc-secret"
                label="reCAPTCHA secret key"
                value={recaptchaSecret}
                onChange={setRecaptchaSecret}
              />
            </div>
          </form>
          <SaveRow id="form-public" saved={savedPublic} />
        </CardContent>
      </Card>
    </div>
  );
}
