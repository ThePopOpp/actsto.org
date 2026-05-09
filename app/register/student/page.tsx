"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, Eye, EyeOff, GraduationCap, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ACT_LOGO_ROUND } from "@/lib/constants";

function getAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function RegisterStudentPage() {
  const [step, setStep] = useState<"age" | "form">("age");
  const [dob, setDob] = useState("");
  const [ageError, setAgeError] = useState<string | null>(null);

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    agreed: false,
  });

  function setField(field: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function verifyAge() {
    setAgeError(null);
    if (!dob) return setAgeError("Please enter your date of birth.");
    const age = getAge(dob);
    if (age < 16) {
      setAgeError(
        "You must be 16 or older to register independently. Ask your parent or guardian to register and add you as a student."
      );
      return;
    }
    setStep("form");
  }

  async function handleSubmit() {
    setError(null);
    if (!form.firstName.trim()) return setError("First name is required.");
    if (!form.email.trim()) return setError("Email is required.");
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
          birthDate: dob,
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
          Students 16+ can register and create campaigns independently.
        </p>

        <Card className="mt-8 border-border/80 shadow-md">
          <CardContent className="space-y-5 p-6">

            {/* Step 1: Age verification */}
            {step === "age" && (
              <>
                <div className="flex justify-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <AlertTriangle className="size-7" />
                  </div>
                </div>
                <h2 className="text-center font-heading text-xl font-semibold text-primary">
                  Age verification
                </h2>
                <p className="text-center text-sm text-muted-foreground">
                  You must be 16 or older to register independently.
                </p>
                {ageError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {ageError}
                  </p>
                )}
                <div>
                  <Label htmlFor="dob">Your date of birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    className="mt-1.5"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 rounded-lg bg-act-banner/60 p-4 text-sm text-act-banner-foreground">
                  <Info className="mt-0.5 size-5 shrink-0" />
                  <p>
                    If you&apos;re under 16, your parent or guardian must{" "}
                    <Link href="/register/parent" className="underline">
                      create an account
                    </Link>{" "}
                    and add you as a student.
                  </p>
                </div>
                <Button type="button" className="w-full" onClick={verifyAge}>
                  Continue
                </Button>
              </>
            )}

            {/* Step 2: Registration form */}
            {step === "form" && (
              <>
                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
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
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
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
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
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
                <Button
                  type="button"
                  className="w-full gap-2"
                  disabled={loading}
                  onClick={handleSubmit}
                >
                  <GraduationCap className="size-4" />
                  {loading ? "Creating account…" : "Create student account"}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setStep("age")}
                >
                  ← Back
                </button>
              </>
            )}
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
