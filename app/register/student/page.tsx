"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, GraduationCap, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ACT_LOGO_ROUND } from "@/lib/constants";

export default function RegisterStudentPage() {
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
            <div className="flex justify-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="size-7" />
              </div>
            </div>
            <h2 className="text-center font-heading text-xl font-semibold text-primary">
              Age verification
            </h2>
            <p className="text-center text-sm text-muted-foreground">
              Students must be 16 years or older to independently create a campaign. Please
              verify your age to continue.
            </p>
            <div>
              <Label htmlFor="dob">Your date of birth *</Label>
              <Input id="dob" type="date" className="mt-1.5" />
            </div>
            <div className="flex gap-3 rounded-lg bg-act-banner/60 p-4 text-sm text-act-banner-foreground">
              <Info className="mt-0.5 size-5 shrink-0" />
              <p>
                If you&apos;re under 16, your parent or guardian must grant permission before
                you can create a scholarship campaign.
              </p>
            </div>
            <Button type="button" className="w-full">
              Verify my age
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center">
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
