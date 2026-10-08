import Link from "next/link";
import { CheckCircle2, CircleDashed } from "lucide-react";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Item = { label: string; vars: string[]; note?: string };
type Group = { title: string; description: string; items: Item[] };

/**
 * Which server credentials are configured, read from the server environment.
 *
 * Values are never shown, sent to the browser or editable here. This page used
 * to be a form whose "Save (demo)" buttons kept secrets in the browser tab and
 * nowhere else. Secrets belong in the host's environment variables (Hostinger
 * → Node.js app → Environment variables), followed by a redeploy.
 */
const GROUPS: Group[] = [
  {
    title: "Payments",
    description: "PayPal checkout and webhook verification. Also editable on Payments.",
    items: [
      { label: "Environment (sandbox or live)", vars: ["PAYPAL_ENVIRONMENT"] },
      { label: "Live client ID and secret", vars: ["PAYPAL_LIVE_CLIENT_ID|PAYPAL_CLIENT_ID", "PAYPAL_LIVE_CLIENT_SECRET|PAYPAL_CLIENT_SECRET"] },
      { label: "Sandbox client ID and secret", vars: ["PAYPAL_SANDBOX_CLIENT_ID|PAYPAL_CLIENT_ID", "PAYPAL_SANDBOX_CLIENT_SECRET|PAYPAL_CLIENT_SECRET"] },
      { label: "Webhook ID", vars: ["PAYPAL_WEBHOOK_ID"] },
    ],
  },
  {
    title: "Email",
    description: "Outgoing receipts and notices, and the shared inbox.",
    items: [
      { label: "Resend API key", vars: ["RESEND_API_KEY"] },
      { label: "From address", vars: ["RESEND_FROM_EMAIL|SMTP_FROM_EMAIL"] },
      { label: "SMTP server", vars: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"] },
      { label: "IMAP inbox", vars: ["IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD"] },
    ],
  },
  {
    title: "Text messages and calls",
    description: "Twilio. Also editable on Communications.",
    items: [
      { label: "Account SID and auth token", vars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"] },
      { label: "Sending number or messaging service", vars: ["TWILIO_PHONE_NUMBER|TWILIO_MESSAGING_SERVICE_SID"] },
    ],
  },
  {
    title: "Platform",
    description: "Database, sign-in and scheduled jobs.",
    items: [
      { label: "Supabase service role key", vars: ["SUPABASE_SERVICE_ROLE_KEY"] },
      { label: "Session signing secret", vars: ["ACT_SESSION_SECRET|AUTH_SECRET"] },
      { label: "Super Admin allowlist", vars: ["ADMIN_EMAILS"] },
      { label: "Scheduled job secret", vars: ["CRON_SECRET"] },
      { label: "Web push keys", vars: ["VAPID_PRIVATE_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY"] },
      { label: "Shepard AI (OpenAI) key", vars: ["OPENAI_API_KEY"] },
    ],
  },
];

/** "A|B" is satisfied by either name. */
function isSet(spec: string) {
  return spec.split("|").some((name) => Boolean(process.env[name]?.trim()));
}

function tempBootstrapActive() {
  return Boolean(process.env.TEMP_SUPER_ADMIN_EMAIL?.trim() && process.env.TEMP_SUPER_ADMIN_PASSWORD);
}

export default function AdminCredentialsPage() {
  const bootstrapVarsPresent = tempBootstrapActive();
  const bootstrapAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_TEMP_SUPER_ADMIN === "true";

  return (
    <>
      <AdminPageHeader
        title="API & credentials"
        description="Which server credentials are configured. Values are never shown here; change them in the hosting environment and redeploy."
      />
      <div className="space-y-6">
        {bootstrapVarsPresent ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 text-sm">
              <strong className="text-destructive">Temporary Super Admin login variables are set.</strong>{" "}
              {bootstrapAllowed
                ? "They are active and work as a Super Admin password. Remove TEMP_SUPER_ADMIN_EMAIL and TEMP_SUPER_ADMIN_PASSWORD from the environment."
                : "Production ignores them, so they can't be used to sign in, but they should still be removed from the environment."}
            </CardContent>
          </Card>
        ) : null}

        {GROUPS.map((group) => (
          <Card key={group.title} className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-primary">{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/60">
                {group.items.map((item) => {
                  const ok = item.vars.every(isSet);
                  return (
                    <li key={item.label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="font-mono text-xs text-muted-foreground">{item.vars.join(", ").replaceAll("|", " or ")}</p>
                      </div>
                      <span className={ok ? "flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400" : "flex items-center gap-1.5 text-muted-foreground"}>
                        {ok ? <CheckCircle2 className="size-4" aria-hidden /> : <CircleDashed className="size-4" aria-hidden />}
                        {ok ? "Configured" : "Not set"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}

        <p className="text-sm text-muted-foreground">
          PayPal and Twilio can also be set from{" "}
          <Link href="/dashboard/admin/billing" className="text-primary underline-offset-4 hover:underline">
            Payments
          </Link>{" "}
          and{" "}
          <Link href="/dashboard/admin/sms" className="text-primary underline-offset-4 hover:underline">
            Communications
          </Link>
          ; environment variables take precedence over those saved values.
        </p>
      </div>
    </>
  );
}
