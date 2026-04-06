"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, ChevronLeft, Eye, EyeOff, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ACT_LOGO_ROUND } from "@/lib/constants";

export default function RegisterDonorPage() {
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
            <User className="size-3.5" />
            Individual donor account
          </Badge>
        </div>
        <h1 className="mt-4 text-center font-heading text-3xl font-semibold text-primary">
          Create your donor account
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Start redirecting your Arizona taxes to Christian education.
        </p>

        <Card className="mt-8 border-border/80 shadow-md">
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fn">First name *</Label>
                <Input id="fn" placeholder="Jane" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="ln">Last name *</Label>
                <Input id="ln" placeholder="Smith" className="mt-1.5" />
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
              <Input id="phone" type="tel" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pw">Password *</Label>
              <div className="relative mt-1.5">
                <Input id="pw" type={showPw ? "text" : "password"} className="pr-10" />
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
                <Input id="pw2" type={showPw2 ? "text" : "password"} className="pr-10" />
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

            <div className="flex gap-3 rounded-lg bg-act-banner/60 p-4 text-sm text-act-banner-foreground">
              <Building2 className="mt-0.5 size-5 shrink-0" />
              <p>
                Arizona tax credit: As an individual donor you may contribute up to{" "}
                <strong>$1,459 (single)</strong> or <strong>$2,918 (married filing jointly)</strong>{" "}
                for tax year limits referenced in your materials — confirm current-year amounts
                with a tax advisor.
              </p>
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

            <Button type="button" className="w-full">
              Create donor account
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
