"use client";

import { useState } from "react";
import Link from "next/link";

import { SmsConsentCheckbox } from "@/components/sms-consent-checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SmsOptInForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    smsConsent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function set(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/sms-opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!response.ok) throw new Error(json?.error ?? "Could not record your request.");
      setStatus(json?.message ?? "Your request has been recorded.");
      if (form.smsConsent) {
        setForm({ firstName: "", lastName: "", email: "", phone: "", smsConsent: false });
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not record your request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl text-primary">SMS Opt-In Form</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sms-first">First Name *</Label>
              <Input
                id="sms-first"
                className="mt-1.5"
                value={form.firstName}
                onChange={(event) => set("firstName", event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="sms-last">Last Name</Label>
              <Input
                id="sms-last"
                className="mt-1.5"
                value={form.lastName}
                onChange={(event) => set("lastName", event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sms-email">Email *</Label>
            <Input
              id="sms-email"
              type="email"
              className="mt-1.5"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="sms-phone">Phone *</Label>
            <Input
              id="sms-phone"
              type="tel"
              className="mt-1.5"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
              required
            />
          </div>
          <SmsConsentCheckbox
            id="sms-page-consent"
            checked={form.smsConsent}
            onCheckedChange={(checked) => set("smsConsent", checked)}
            copyKey="optInPage"
          />
          <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Privacy & Data Handling</p>
            <p className="mt-2">
              No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.
              All SMS opt-in data and consent records are kept confidential and are never sold, rented, or disclosed.
              ACTSTO.ORG does not use purchased lead lists.
            </p>
          </div>
          {status ? (
            <p className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-primary">
              {status}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit SMS preference"}
          </Button>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <Link href="/legal/privacy" className="font-medium text-act-red hover:underline">
              Read Privacy Policy
            </Link>
            <Link href="/legal/communication-policy" className="font-medium text-act-red hover:underline">
              Communication Policy
            </Link>
            <Link href="/legal/terms" className="font-medium text-act-red hover:underline">
              Terms of Service
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
