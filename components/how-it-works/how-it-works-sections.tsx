import Link from "next/link";
import { ArrowRight, Check, CircleCheck, Star } from "lucide-react";

import { HomeHowItWorksSplit } from "@/components/home/home-sections";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

import { TaxCreditsTabs } from "./tax-credits-tabs";

const simpleProcessSteps = [
  {
    n: 1,
    accent: "red" as const,
    title: "Create Your Campaign",
    body: "Tell your story, set your tuition goal, and upload photos. Our team reviews and approves campaigns within 48 hours.",
  },
  {
    n: 2,
    accent: "blue" as const,
    title: "Share with Your Community",
    body: "Use your unique campaign link via email, text, or social media. Church members, family, and friends can donate in minutes.",
  },
  {
    n: 3,
    accent: "blue" as const,
    title: "Receive Donations",
    body: "Contributions are processed securely and disbursed directly to your school’s tuition account — no delays, no surprises.",
  },
  {
    n: 4,
    accent: "red" as const,
    title: "Make an Impact",
    body: "Your child attends school. Donors receive an impact update. The cycle of generosity continues for the next family in need.",
  },
];

const faithCards = [
  {
    title: "Faith-Based Giving",
    body: "Every campaign on our platform reflects Christian values. Donors give knowing their generosity supports schools that integrate faith, character, and academic excellence.",
    icon: Star,
  },
  {
    title: "Full Transparency",
    body: "Every dollar is tracked and reported. Families receive funds directly, and donors receive receipts and impact updates throughout the school year. Nothing is hidden.",
    icon: Check,
  },
  {
    title: "Real, Lasting Impact",
    body: "One year of support changes a child’s trajectory. Our campaigns fund not just tuition but futures — young believers growing into leaders, professionals, and servants.",
    icon: CircleCheck,
  },
];

const trustItems = [
  "Arizona STO Certified",
  "Tax-Credit Eligible Donations",
  "Secure Payment Processing",
  "Faith-Based & Transparent",
];

export function HowItWorksSections() {
  return (
    <>
      <section className="bg-primary py-14 text-primary-foreground sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-widest text-act-red uppercase">
            Simple process
          </p>
          <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl md:text-[2.75rem] md:leading-tight">
            How It Works
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
            From application to impact, we make Christian school funding straightforward and stress-free.
          </p>

          <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {simpleProcessSteps.map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    "relative z-[1] flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-md",
                    step.accent === "red" ? "bg-act-red" : "bg-primary-foreground/15 ring-2 ring-primary-foreground/40"
                  )}
                >
                  {step.n}
                </div>
                <h2 className="mt-5 font-heading text-lg font-semibold text-white">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/campaigns/new"
              className={cn(
                buttonVariants({ variant: "cta", size: "lg" }),
                "min-w-[200px] border border-white/30"
              )}
            >
              Start a campaign
            </Link>
            <Link
              href="/campaigns"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-w-[200px] border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              )}
            >
              Donate today
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-background py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-wide text-act-red uppercase">
            Why Arizona Christian Tuition
          </p>
          <h2 className="mx-auto mt-2 max-w-3xl font-heading text-3xl font-semibold text-primary sm:text-4xl">
            Giving Rooted in Faith, Guided by Purpose
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            We connect generous donors with families who believe in the transformative power of a Christian education.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {faithCards.map(({ title, body, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-sky-200/80 bg-card p-6 text-center shadow-sm ring-1 ring-foreground/5 dark:border-sky-900/40"
              >
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="size-6" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-sky-100/70 to-background py-14 dark:from-sky-950/40 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Badge className="bg-primary px-4 py-1.5 text-xs font-semibold tracking-wide text-primary-foreground uppercase">
            Tax credits available
          </Badge>
          <h2 className="mt-6 font-heading text-3xl font-semibold text-primary sm:text-4xl">
            Individuals
          </h2>

          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-foreground/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-left text-primary-foreground">
                  <th className="px-4 py-3 font-semibold">Tuition tax credits</th>
                  <th className="px-4 py-3 font-semibold">Individual</th>
                  <th className="px-4 py-3 font-semibold">Married jointly</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-t border-border">
                  <td className="px-4 py-3 font-medium">Original credit max</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">$769</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">$1,535</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3 font-medium">Overflow max</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">$766</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">$1,527</td>
                </tr>
                <tr className="border-t border-border bg-muted/40">
                  <td className="px-4 py-3 font-semibold">Tuition credits max</td>
                  <td className="px-4 py-3 font-bold tabular-nums">$1,535</td>
                  <td className="px-4 py-3 font-bold tabular-nums">$3,062</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-8 text-left text-sm leading-relaxed text-muted-foreground sm:text-center">
            This program allows corporations to donate to certified STOs and receive a dollar-for-dollar tax credit against their Arizona tax liability. In 2025 up to $135M is available in AZ state tax credits each fiscal year that can be directed to low-income students and an additional $6M can be offset to support disabled/displaced. There is no set limit to the amount a single corporation can claim. The pre-approval application period opens in early July and has recently been subscribed to after the first couple of weeks. To claim this credit, you must work with a STO certified by the state to help you navigate the process —{" "}
            <Link href="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
              contact us today
            </Link>
            . See our{" "}
            <Link href="/faq" className="font-medium text-primary underline-offset-4 hover:underline">
              FAQ
            </Link>{" "}
            for more details.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/donate/detailed" className={cn(buttonVariants({ size: "lg" }), "min-w-[180px]")}>
              Give now
            </Link>
            <Link
              href="/contact"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-w-[180px]")}
            >
              Talk to our team
            </Link>
          </div>
        </div>
      </section>

      <TaxCreditsTabs />

      <HomeHowItWorksSplit />

      <section className="bg-primary py-14 text-primary-foreground sm:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-widest text-act-red uppercase">Join the mission</p>
          <h2 className="mt-4 font-heading text-3xl font-semibold sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Every Gift Plants a Seed of Faith
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
            Whether you&apos;re a family in need or a believer ready to give, Arizona Christian Tuition is the bridge between generosity and opportunity.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/campaigns"
              className={cn(
                buttonVariants({ variant: "cta", size: "lg" }),
                "w-full min-w-[220px] border border-white/25 sm:w-auto"
              )}
            >
              Donate to a campaign
            </Link>
            <Link
              href="/campaigns/new"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full min-w-[220px] border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
              )}
            >
              Start a campaign
            </Link>
          </div>
          <p className="mt-12 text-xs font-semibold tracking-wide text-primary-foreground/60 uppercase">
            Trusted by Arizona families
          </p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/90">
            {trustItems.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-emerald-300" aria-hidden />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white underline-offset-4 hover:underline"
            >
              Need help? Contact us
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
