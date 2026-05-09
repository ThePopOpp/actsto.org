"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function QuickContactForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setSubmitting(true);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: data,
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Could not send your message.");
      form.reset();
      setStatus("Thanks. Your message was sent to hello@actsto.org.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send your message.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl text-primary">
          Quick contact form
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submitContact}>
          <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cf-first">First name *</Label>
              <Input id="cf-first" name="firstName" className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="cf-last">Last name</Label>
              <Input id="cf-last" name="lastName" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="cf-email">Email *</Label>
            <Input id="cf-email" name="email" type="email" className="mt-1.5" required />
          </div>
          <div>
            <Label htmlFor="cf-phone">Phone</Label>
            <Input id="cf-phone" name="phone" type="tel" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="cf-msg">Your inquiry *</Label>
            <Textarea
              id="cf-msg"
              name="message"
              placeholder="Please describe your question or how we can help..."
              className="mt-1.5 min-h-[120px]"
              required
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <Checkbox className="mt-0.5" name="consent" required />
            <span>
              I consent to Arizona Christian Tuition storing my submitted information
              so they can respond to my inquiry *
            </span>
          </label>
          {status ? (
            <p className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-primary">
              {status}
            </p>
          ) : null}
          <Button type="submit" variant="cta" className="w-full" disabled={submitting}>
            {submitting ? "Sending..." : "Submit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
