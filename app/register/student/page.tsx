"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Eye, EyeOff, GraduationCap, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmsConsentCheckbox } from "@/components/sms-consent-checkbox";
import { ACT_LOGO_ROUND } from "@/lib/constants";

export default function RegisterStudentPage() {
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    inviteToken: "",
    password: "",
    confirm: "",
    agreed: false,
    smsConsent: false,
  });

  function setField(field: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  useEffect(() => {
    const invite = new URLSearchParams(window.location.search).get("invite");
    if (invite) {
      setForm((current) => ({ ...current, inviteToken: invite }));
    }
  }, []);

  async function handleSubmit() {
    setError(null);
    if (!form.firstName.trim()) return setError("First name is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (!form.inviteToken.trim()) return setError("Student invite token is required.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (!form.agreed) return setError("You must agree to the Terms and Privacy Policy.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          role: "student",
          studentInviteToken: form.inviteToken.trim(),
          smsConsent: form.smsConsent,
          smsConsentSource: "register_student",
        }),
      });
      const json = (await res.json()) as { ok?: boolean; redirect?: string; error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "Registration failed. Please try again.");
        return;
      }
      if (json.redirect) window.location.href = json.redirect;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] bg-muted/50 py-10">
      <div className="mx-auto max-w-lg px-4">
        <div className="flex justify-center">
          <Image src={ACT_LOGO_ROUND} alt="" width={64} height={64} />
        </div>
        <div className="mt-4 flex justify-center">
          <Badge variant="secondary" className="gap-1 bg-act-banner text-act-banner-foreground">
            <GraduationCap className="size-3.5" />
            Student account
          </Badge>
        </div>
        <h1 className="mt-4 text-center font-heading text-3xl font-semibold text-primary">
          Student registration
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Students 16+ can create an independent login after a parent or guardian creates their
          student profile and sends an invite.
        </p>

        <Card className="mt-8 border-border/80 shadow-md">
          <CardContent className="space-y-5 p-6">
            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fn">First name *</Label>
                <Input
                  id="fn"
                  className="mt-1.5"
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ln">Last name</Label>
                <Input
                  id="ln"
                  className="mt-1.5"
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email address *</Label>
              <Input
                id="email"
                type="email"
                className="mt-1.5"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone number (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(602) 555-0100"
                className="mt-1.5"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>
            <SmsConsentCheckbox
              id="sms-consent"
              checked={form.smsConsent}
              onCheckedChange={(checked) => setField("smsConsent", checked)}
              copyKey="universal"
            />

            <div>
              <Label htmlFor="invite">Student invite token *</Label>
              <Input
                id="invite"
                className="mt-1.5"
                value={form.inviteToken}
                onChange={(e) => setField("inviteToken", e.target.value)}
                placeholder="Paste the invite from your parent or guardian"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                This links your login to the student record your parent or guardian already
                created. The invite also confirms that independent student access is allowed.
              </p>
            </div>

            <div className="flex gap-3 rounded-lg bg-act-banner/60 p-4 text-sm text-act-banner-foreground">
              <Info className="mt-0.5 size-5 shrink-0" />
              <p>
                If you do not have an invite, ask your parent or guardian to add you from their
                dashboard first. Students under 16 stay parent-managed.
              </p>
            </div>

            <div>
              <Label htmlFor="pw">Password *</Label>
              <div className="relative mt-1.5">
                <Input
                  id="pw"
                  type={showPw ? "text" : "password"}
                  placeholder="Min 8 characters"
                  className="pr-10"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="pw2">Confirm password *</Label>
              <div className="relative mt-1.5">
                <Input
                  id="pw2"
                  type={showPw2 ? "text" : "password"}
                  placeholder="Re-enter password"
                  className="pr-10"
                  value={form.confirm}
                  onChange={(e) => setField("confirm", e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPw2(!showPw2)}
                  aria-label={showPw2 ? "Hide password" : "Show password"}
                >
                  {showPw2 ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={form.agreed}
                onCheckedChange={(v) => setField("agreed", Boolean(v))}
              />
              <span>
                I agree to the{" "}
                <Link href="/legal/terms" className="text-act-red hover:underline">
                  ACT Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/legal/privacy" className="text-act-red hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <Button type="button" className="w-full gap-2" disabled={loading} onClick={handleSubmit}>
              <GraduationCap className="size-4" />
              {loading ? "Creating account..." : "Create student account"}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-act-red hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Back to account types
          </Link>
        </p>
      </div>
    </div>
  );
}
