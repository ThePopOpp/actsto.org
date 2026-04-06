import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Building2, GraduationCap, Heart, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ACT_LOGO_ROUND } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Create your ACT account",
};

const types = [
  {
    href: "/register/donor",
    title: "Individual donor",
    subtitle: "Arizona taxpayer",
    badge: "Most common",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    description:
      "Redirect your Arizona state taxes to fund Christian school scholarships. Receive a dollar-for-dollar credit on your AZ state taxes up to the annual limit.",
    icon: User,
  },
  {
    href: "/register/business",
    title: "Business donor",
    subtitle: "Corporation / LLC / organization",
    badge: "Corporate tax credit",
    badgeClass: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
    description:
      "Arizona businesses can contribute through the corporate school tuition tax credit — a powerful way to invest in your community.",
    icon: Building2,
  },
  {
    href: "/register/parent",
    title: "Parent / guardian",
    subtitle: "Start a campaign for your child",
    badge: "Create campaigns",
    badgeClass: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
    description:
      "Create a tuition scholarship campaign for your child’s Christian school. Add students, set a goal, and share with your community.",
    icon: Heart,
  },
  {
    href: "/register/student",
    title: "Student",
    subtitle: "Age 16+ or with parental permission",
    badge: "Age gate required",
    badgeClass: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
    description:
      "Students 16+ can register independently. Under 16 requires a parent approval request before publishing a campaign.",
    icon: GraduationCap,
  },
];

export default function RegisterPage() {
  return (
    <div className="bg-gradient-to-b from-background to-act-banner/30">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <Image src={ACT_LOGO_ROUND} alt="" width={80} height={80} />
        </div>
        <h1 className="mt-6 text-center font-heading text-3xl font-semibold text-primary sm:text-4xl">
          Create your ACT account
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Choose the account type that best describes you. All account types support
          Arizona&apos;s Private School Tax Credit system.
        </p>
        <p className="mt-2 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-act-red hover:underline">
            Sign in
          </Link>
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {types.map((t) => (
            <Card
              key={t.href}
              className="border-border/80 shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-2">
                  <t.icon className="size-10 text-primary" strokeWidth={1.25} />
                  <Badge className={t.badgeClass}>{t.badge}</Badge>
                </div>
                <div>
                  <h2 className="font-heading text-xl font-semibold text-primary">
                    {t.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{t.subtitle}</p>
                </div>
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <Link
                  href={t.href}
                  className="inline-block text-sm font-semibold text-act-red hover:underline"
                >
                  Get started →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-primary px-6 py-5 text-primary-foreground">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">Arizona Private School Tax Credit (A.R.S. § 43-1089)</span>{" "}
            — Qualifying donations made through ACT may be eligible for a dollar-for-dollar
            Arizona state tax credit. Consult a tax professional for your situation.
          </p>
        </div>
      </section>
    </div>
  );
}
