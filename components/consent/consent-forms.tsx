"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONSENT_CATEGORIES, EMAIL_CONSENT_COPY } from "@/lib/consent/constants";
import { SMS_CONSENT_COPY } from "@/lib/sms/consent-copy";
import { cn } from "@/lib/utils";

function Done({ title, body }: { title: string; body: string }) {
  return (
    <Card className="border-emerald-500/30">
      <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
        <CheckCircle2 className="size-8 text-emerald-600" />
        <p className="font-heading text-lg font-semibold text-primary">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
    return { ok: res.ok, error: data.error, data };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}

// ── SMS opt-in (A2P 10DLC compliant) ─────────────────────────────────────────
export function SmsOptInForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false); // unchecked by default
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!consent) { setError("Please check the SMS consent box to opt in."); return; }
    if (website) { setDone(true); return; }
    setBusy(true);
    setError(null);
    const r = await post("/api/public/consent/sms/opt-in", { name, phone, consent });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Could not opt in."); return; }
    setDone(true);
  }

  if (done) return <Done title="You're subscribed to ACTSTO text messages" body="You can reply STOP at any time to unsubscribe, or HELP for assistance." />;

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="n" className="text-sm">Name (optional)</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
          <div><Label htmlFor="p" className="text-sm">Mobile phone <span className="text-act-red">*</span></Label><Input id="p" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(602) 555-0123" className="mt-1.5" /></div>
        </div>
        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0" />
          <span className="text-sm leading-relaxed text-muted-foreground">{SMS_CONSENT_COPY.optInPage}</span>
        </label>

        <p className="text-xs text-muted-foreground">
          Consent is <strong>not required</strong> to apply for a scholarship, donate, create an account, or use ACTSTO.ORG services.
          SMS consent is separate from our Terms of Service and Privacy Policy.
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" onClick={() => void submit()} disabled={busy || !phone.trim()}>
          {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null} Opt in to text messages
        </Button>
      </CardContent>
    </Card>
  );
}

export function SmsOptOutForm() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const r = await post("/api/public/consent/sms/opt-out", { phone });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Could not opt out."); return; }
    setDone(true);
  }
  if (done) return <Done title="You've been unsubscribed" body="You will no longer receive SMS messages from ACTSTO. You can opt back in anytime." />;

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 p-6">
        <div><Label htmlFor="p" className="text-sm">Mobile phone</Label><Input id="p" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" /></div>
        <p className="text-xs text-muted-foreground">You can also reply <strong>STOP</strong> to any ACTSTO text message to unsubscribe.</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" variant="outline" onClick={() => void submit()} disabled={busy || !phone.trim()}>
          {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null} Unsubscribe from texts
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Email ────────────────────────────────────────────────────────────────────
export function EmailOptInForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cats, setCats] = useState({ marketing: true, campaignUpdates: true, donationUpdates: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const r = await post("/api/public/consent/email/opt-in", { name, email, ...cats });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Could not subscribe."); return; }
    setDone(true);
  }
  if (done) return <Done title="Check your inbox to confirm" body={`We sent a confirmation link to ${email}. Click it to finish subscribing.`} />;

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="n" className="text-sm">Name (optional)</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
          <div><Label htmlFor="e" className="text-sm">Email <span className="text-act-red">*</span></Label><Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">I&apos;d like to receive</Label>
          {CONSENT_CATEGORIES.map((c) => (
            <label key={c.key} className="flex items-start gap-3 rounded-lg border border-border p-2.5">
              <input type="checkbox" checked={cats[c.key]} onChange={(e) => setCats((p) => ({ ...p, [c.key]: e.target.checked }))} className="mt-0.5 size-4 shrink-0" />
              <span><span className="text-sm font-medium text-foreground">{c.label}</span><span className="block text-xs text-muted-foreground">{c.help}</span></span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{EMAIL_CONSENT_COPY}</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" onClick={() => void submit()} disabled={busy || !email.includes("@")}>
          {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null} Subscribe
        </Button>
      </CardContent>
    </Card>
  );
}

export function EmailOptOutForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const r = await post("/api/public/consent/email/opt-out", { email });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Could not unsubscribe."); return; }
    setDone(true);
  }
  if (done) return <Done title="You've been unsubscribed" body="You'll still receive essential account and receipt emails. Manage individual categories in the preferences center." />;

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 p-6">
        <div><Label htmlFor="e" className="text-sm">Email</Label><Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" variant="outline" onClick={() => void submit()} disabled={busy || !email.includes("@")}>
          {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null} Unsubscribe
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Email confirm ────────────────────────────────────────────────────────────
export function EmailConfirmClient({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!token) { if (active) { setState("error"); setMsg("Missing confirmation token."); } return; }
      const r = await post("/api/public/consent/email/confirm", { token });
      if (!active) return;
      if (r.ok) { setState("ok"); setMsg(String(r.data?.email ?? "")); } else { setState("error"); setMsg(r.error ?? "This link is invalid or expired."); }
    })();
    return () => { active = false; };
  }, [token]);

  if (state === "loading") return <Card className="border-border/80"><CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Confirming…</CardContent></Card>;
  if (state === "ok") return <Done title="Subscription confirmed" body={`Thanks! ${msg} is now subscribed to ACTSTO emails. Manage categories anytime in the preferences center.`} />;
  return <Card className="border-destructive/30"><CardContent className="p-8 text-center text-sm text-destructive">{msg}</CardContent></Card>;
}

// ── Preferences center ───────────────────────────────────────────────────────
export function PreferencesCenter() {
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [contact, setContact] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [state, setState] = useState({ status: "subscribed", marketing: true, campaignUpdates: true, donationUpdates: true });

  async function lookup() {
    setBusy(true);
    setNotice(null);
    const r = await post("/api/public/consent/preferences", channel === "email" ? { channel, email: contact } : { channel, phone: contact });
    setBusy(false);
    if (!r.ok) { setNotice(r.error ?? "Lookup failed."); return; }
    const s = (r.data?.state ?? null) as null | { status: string; marketing: boolean; campaignUpdates: boolean; donationUpdates: boolean };
    if (s) setState({ status: s.status, marketing: s.marketing, campaignUpdates: s.campaignUpdates, donationUpdates: s.donationUpdates });
    else setState({ status: "subscribed", marketing: false, campaignUpdates: true, donationUpdates: true });
    setLoaded(true);
  }

  async function save(next: typeof state) {
    setBusy(true);
    setNotice(null);
    const body = channel === "email"
      ? { channel, email: contact, status: next.status, marketing: next.marketing, campaignUpdates: next.campaignUpdates, donationUpdates: next.donationUpdates }
      : { channel, phone: contact, status: next.status };
    const res = await fetch("/api/public/consent/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    setNotice(res.ok ? "Preferences saved." : "Could not save.");
  }

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 p-6">
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
          {(["email", "sms"] as const).map((c) => (
            <button key={c} type="button" onClick={() => { setChannel(c); setLoaded(false); }} className={cn("rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors", channel === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{c}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1"><Label className="text-sm">{channel === "email" ? "Your email" : "Your mobile phone"}</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} type={channel === "email" ? "email" : "tel"} className="mt-1.5" /></div>
          <Button type="button" variant="outline" onClick={() => void lookup()} disabled={busy || !contact.trim()}>{busy ? <Loader2 className="size-4 animate-spin" /> : "Load"}</Button>
        </div>

        {loaded ? (
          <div className="space-y-3 border-t border-border pt-4">
            {channel === "email" ? (
              CONSENT_CATEGORIES.map((cat) => (
                <label key={cat.key} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                  <span><span className="text-sm font-medium text-foreground">{cat.label}</span><span className="block text-xs text-muted-foreground">{cat.help}</span></span>
                  <input type="checkbox" checked={state[cat.key]} onChange={(e) => { const next = { ...state, [cat.key]: e.target.checked, status: "subscribed" }; setState(next); void save(next); }} className="size-4 shrink-0" />
                </label>
              ))
            ) : (
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                <span className="text-sm font-medium text-foreground">Receive SMS messages</span>
                <input type="checkbox" checked={state.status === "subscribed"} onChange={(e) => { const next = { ...state, status: e.target.checked ? "subscribed" : "unsubscribed" }; setState(next); void save(next); }} className="size-4 shrink-0" />
              </label>
            )}
            <Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => { const next = { status: "unsubscribed", marketing: false, campaignUpdates: false, donationUpdates: false }; setState(next); void save(next); }}>
              Unsubscribe from all {channel} messages
            </Button>
          </div>
        ) : null}
        {notice ? <p className="text-sm text-primary">{notice}</p> : null}
      </CardContent>
    </Card>
  );
}
