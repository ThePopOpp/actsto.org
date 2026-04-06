"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Eye, EyeOff, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ACT_LOGO_ROUND } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function RegisterParentPage() {
  const [step, setStep] = useState(1);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  return (
    <div className="min-h-[80vh] bg-muted/50 py-10">
      <div className="mx-auto max-w-lg px-4">
        <div className="flex justify-center">
          <Image src={ACT_LOGO_ROUND} alt="" width={64} height={64} />
        </div>
        <div className="mt-4 flex justify-center">
          <Badge variant="secondary" className="gap-1 bg-act-banner text-act-banner-foreground">
            <Heart className="size-3.5" />
            Parent / guardian account
          </Badge>
        </div>
        <h1 className="mt-4 text-center font-heading text-3xl font-semibold text-primary">
          Parent registration
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Create your account, then add your students to start a campaign.
        </p>

        <div className="mt-8 flex items-center justify-between gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-1 items-center">
              {n > 1 && (
                <div
                  className={cn(
                    "h-px flex-1",
                    step >= n ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  step === n && "bg-primary text-primary-foreground",
                  step > n && "bg-primary text-primary-foreground",
                  step < n && "bg-muted text-muted-foreground"
                )}
              >
                {n}
              </div>
              {n < 3 && (
                <div
                  className={cn(
                    "h-px flex-1",
                    step > n ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span className={cn(step === 1 && "font-semibold text-primary")}>Your info</span>
          <span className={cn(step === 2 && "font-semibold text-primary")}>Add students</span>
          <span className={cn(step === 3 && "font-semibold text-primary")}>Done</span>
        </div>

        <Card className="mt-8 border-border/80 shadow-md">
          <CardContent className="space-y-4 p-6">
            {step === 1 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="fn">First name *</Label>
                    <Input id="fn" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="ln">Last name *</Label>
                    <Input id="ln" className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="nick">Nickname (optional)</Label>
                  <Input
                    id="nick"
                    placeholder="What should we call you?"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email address *</Label>
                  <Input id="email" type="email" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone number (optional)</Label>
                  <Input id="phone" type="tel" placeholder="(602) 555-0100" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="pw">Password *</Label>
                  <div className="relative mt-1.5">
                    <Input id="pw" type={showPw ? "text" : "password"} placeholder="Min 8 characters" className="pr-10" />
                    <button type="button" className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="pw2">Confirm password *</Label>
                  <div className="relative mt-1.5">
                    <Input id="pw2" type={showPw2 ? "text" : "password"} placeholder="Re-enter password" className="pr-10" />
                    <button type="button" className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw2(!showPw2)}>
                      {showPw2 ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox className="mt-0.5" />
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
                <Button type="button" className="w-full gap-2" onClick={() => setStep(2)}>
                  <Heart className="size-4" />
                  Create parent account & continue
                </Button>
              </>
            )}
            {step === 2 && (
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>Add students (names, grades, schools) — mirror your WordPress flow here.</p>
                <Button type="button" variant="secondary" onClick={() => setStep(3)}>
                  Continue
                </Button>
              </div>
            )}
            {step === 3 && (
              <p className="text-center text-sm text-muted-foreground">
                You&apos;re all set. Redirect to dashboard or campaign wizard next.
              </p>
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
