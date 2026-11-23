import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getActSession } from "@/lib/auth/session-server";
import { isSuperAdminEmail } from "@/lib/mcp/auth";
import { AUTHZ_FIELDS, checkAuthorize, consentToken, readAuthorize } from "@/lib/mcp/consent";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connect an AI app", robots: { index: false, follow: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">{children}</div>
    </div>
  );
}

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </Shell>
  );
}

// OAuth consent for the ACT MCP connector (Claude, ChatGPT, Codex). Sign-in is
// the normal ACTSTO.ORG login; only Super Admins can connect an AI app.
export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const req = readAuthorize(one);

  const check = await checkAuthorize(req);
  if (!check.ok) return <Problem title="Can't connect" body={check.error} />;

  const session = await getActSession();
  if (!session) {
    const qs = new URLSearchParams(Object.entries(req).filter(([, v]) => v) as [string, string][]).toString();
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${qs}`)}`);
  }
  if (session.role !== "super_admin" || !(await isSuperAdminEmail(session.email))) {
    return <Problem title="Super Admins only" body={`${session.email} can't connect an AI app to ACTSTO.ORG. Sign in with a Super Admin account.`} />;
  }

  const redirectHost = new URL(req.redirect_uri).host;
  const token = consentToken(session.email, req);

  return (
    <Shell>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ShieldCheck className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">Allow {check.client.clientName} to use ACTSTO.ORG?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It will act as <span className="font-medium text-foreground">{session.email}</span>: read campaigns and leads, add and update leads, draft outreach
        emails and social posts, and approve and send drafts when you ask it to. Every action is logged.
      </p>
      <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Returns to <span className="font-mono text-foreground">{redirectHost}</span>. Only continue if you started this from your AI app.
      </p>
      <form method="post" action="/api/oauth/authorize" className="mt-6 flex gap-2">
        {AUTHZ_FIELDS.map((k) => (
          <input key={k} type="hidden" name={k} value={req[k]} />
        ))}
        <input type="hidden" name="consent" value={token} />
        <Button type="submit" name="decision" value="deny" variant="outline" className="flex-1">
          Deny
        </Button>
        <Button type="submit" name="decision" value="approve" className="flex-1">
          Allow
        </Button>
      </form>
    </Shell>
  );
}
