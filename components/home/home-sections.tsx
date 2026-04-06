import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Globe,
  GraduationCap,
  Heart,
  Play,
  Shield,
  Users,
  Zap,
} from "lucide-react";

import { HomeTaxCreditInfoModals } from "@/components/home/tax-credit-info-modals";
import { CampaignCard } from "@/components/campaign-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BROWSE_SCHOOL_TYPE_LABELS, MOCK_CAMPAIGNS } from "@/lib/campaigns";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const impactStats = [
  {
    value: "$8.2M",
    label: "Tax Credits Donated",
    sub: "redirected to Christian schools",
  },
  {
    value: "3,840",
    label: "Students Funded",
    sub: "in 2025–26 school year",
  },
  {
    value: "94",
    label: "Partner Schools",
    sub: "across Arizona",
  },
  {
    value: "100%",
    label: "Tax Credit Return",
    sub: "donors receive full credit back",
  },
];

const taxCreditSteps = [
  {
    Icon: Heart,
    step: "Step 1",
    title: "Choose a Campaign",
    body: "Browse certified campaigns and families seeking tuition support at Christian schools across Arizona.",
  },
  {
    Icon: Globe,
    step: "Step 2",
    title: "Make Your Donation",
    body: "Give securely online or by check. Your gift qualifies for a dollar-for-dollar Arizona tax credit.",
  },
  {
    Icon: Shield,
    step: "Step 3",
    title: "Claim Your Credit",
    body: "File your Arizona taxes and claim the credit up to the statutory maximum for your filing status.",
  },
  {
    Icon: Zap,
    step: "Step 4",
    title: "Change a Student’s Future",
    body: "Scholarships are awarded to qualifying students — redirecting taxes you already owe.",
  },
];

const howSteps = [
  {
    title: "Make a Donation to ACT",
    body: "Contribute online, by check, or through payroll withholding up to the annual maximum.",
  },
  {
    title: "Receive a Dollar-for-Dollar Tax Credit",
    body: "File your Arizona state taxes and claim the credit back — dollar for dollar — up to the statutory limit.",
  },
  {
    title: "ACT Awards Tuition Scholarships",
    body: "Funds are distributed as scholarships to qualifying Arizona students attending Christian schools.",
  },
  {
    title: "A Family’s Dream Becomes Reality",
    body: "A child gains access to a Christ-centered education — at no net cost to you.",
  },
];

const whoWeServe = [
  {
    icon: Play,
    title: "Donors",
    description:
      "Transform your Arizona state tax liability into scholarships. Give up to the maximum and pay nothing extra out of pocket.",
    links: [
      { href: "/donate/detailed", label: "Donate Now" },
      { href: "/faq", label: "What Is a Tax Credit?" },
      { href: "/how-it-works", label: "How Much Can I Give?" },
      { href: "/faq", label: "Claim Your Credit" },
      { href: "/login", label: "Donor Portal Login" },
    ],
  },
  {
    icon: Users,
    title: "Parents",
    description:
      "Apply for a tuition scholarship and give your child access to quality Christian education — regardless of family income.",
    links: [
      { href: "/register/parent", label: "Apply Now" },
      { href: "/how-it-works", label: "How It Works" },
      { href: "/faq", label: "Parent FAQ" },
      { href: "/resources", label: "Award Year Timeline" },
      { href: "/login", label: "Parent Portal Login" },
    ],
  },
  {
    icon: GraduationCap,
    title: "Schools",
    description:
      "Partner with Arizona Christian Tuition to connect your institution with scholarship funds and support more families.",
    links: [
      { href: "/contact", label: "Partner With Us" },
      { href: "/resources", label: "Award Year Timeline" },
      { href: "/login", label: "School Portal Login" },
    ],
  },
];

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-primary-foreground/80">{label}</span>
      <span
        className={cn(
          "tabular-nums font-semibold",
          highlight ? "text-amber-300" : "text-primary-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-wide text-act-red uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 font-heading text-2xl font-semibold text-primary sm:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function HomeImpactStats() {
  return (
    <section className="border-y border-border bg-background py-12 sm:py-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-8 lg:px-8">
        {impactStats.map((s) => (
          <div key={s.label} className="text-center lg:text-left">
            <p className="font-heading text-3xl font-semibold text-primary sm:text-4xl">
              {s.value}
            </p>
            <p className="mt-2 text-sm font-semibold text-act-red">{s.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeNewCampaigns() {
  return (
    <section className="bg-background py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Active campaigns"
          title="New Student Campaigns"
          action={
            <Link
              href="/campaigns/new"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-primary text-primary hover:bg-primary/5"
              )}
            >
              Start a Campaign
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_CAMPAIGNS.map((c) => (
            <CampaignCard key={c.slug} campaign={c} variant="home" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeFeaturedCampaigns() {
  return (
    <section
      id="featured-campaigns"
      className="scroll-mt-24 bg-slate-100/80 py-14 dark:bg-white/[0.06] sm:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Featured Campaigns"
          subtitle="Certified Arizona Christian schools seeking your tax credit dollars"
          action={
            <Link
              href="/campaigns"
              className="text-sm font-semibold text-act-red hover:underline"
            >
              View all &gt;
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_CAMPAIGNS.map((c) => (
            <CampaignCard key={`feat-${c.slug}`} campaign={c} variant="home" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeBrowseSchoolTypes() {
  return (
    <section className="bg-background py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
          Browse by School Type
        </h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {BROWSE_SCHOOL_TYPE_LABELS.map((label) => (
            <Link
              key={label}
              href={`/campaigns?schoolType=${encodeURIComponent(label)}`}
              className="inline-flex"
            >
              <Badge
                variant="outline"
                className="cursor-pointer rounded-full border-border px-3 py-1.5 text-sm font-normal transition-colors hover:bg-muted"
              >
                {label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeGainingMomentum() {
  return (
    <section className="bg-slate-100/80 py-14 dark:bg-white/[0.06] sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="🔥 Gaining Momentum"
          subtitle="Most active campaigns this week"
          action={
            <Link
              href="/campaigns"
              className="text-sm font-semibold text-act-red hover:underline"
            >
              See all &gt;
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[...MOCK_CAMPAIGNS].reverse().map((c) => (
            <CampaignCard key={`mom-${c.slug}`} campaign={c} variant="home" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeHowTaxCreditWorks() {
  return (
    <section className="bg-background py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-semibold text-primary sm:text-3xl md:text-4xl">
            How the Arizona Tax Credit Works
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">
            Arizona&apos;s Private School Tax Credit (A.R.S. § 43-1089) lets you redirect your
            state tax dollars directly to certified Christian schools — at zero cost to you.
          </p>
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {taxCreditSteps.map(({ Icon, step, title, body }) => (
            <div key={title} className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-act-red text-act-red">
                <Icon className="size-6" strokeWidth={1.5} />
              </div>
              <p className="mt-4 text-xs font-bold tracking-wide text-act-red uppercase">
                {step}
              </p>
              <h3 className="mt-2 font-heading text-lg font-semibold text-primary">
                {title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
        <HomeTaxCreditInfoModals />
      </div>
    </section>
  );
}

export function HomeHowItWorksSplit() {
  return (
    <section className="bg-slate-50 py-14 dark:bg-white/[0.08] sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
          How it works
        </p>

        <div className="mt-2 grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-primary sm:text-3xl md:text-4xl">
              Your Tax Dollars, Transformed
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Arizona&apos;s Private School Tax Credit Program lets you redirect what you owe into
              scholarships — at no extra cost to you.
            </p>
            <ol className="mt-10 space-y-8">
              {howSteps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-primary">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <Card className="border-0 bg-primary text-primary-foreground shadow-xl lg:sticky lg:top-28">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div>
                <p className="text-xs font-semibold tracking-wide text-primary-foreground/70 uppercase">
                  2026 Tax Credit Maximums
                </p>
                <Badge className="mt-3 bg-act-red text-white hover:bg-act-red/90">
                  2026 Tax Year
                </Badge>
              </div>

              <div className="space-y-4 rounded-xl border border-primary-foreground/20 p-4">
                <p className="text-xs font-semibold tracking-wide text-primary-foreground/80 uppercase">
                  Single filer
                </p>
                <Row label="Original Tax Credit" value="$787" />
                <Row label="Overflow Tax Credit" value="$784" />
                <Separator className="bg-primary-foreground/20" />
                <Row label="Combined Maximum" value="$1,571" highlight />
              </div>

              <div className="space-y-4 rounded-xl border border-primary-foreground/20 p-4">
                <p className="text-xs font-semibold tracking-wide text-primary-foreground/80 uppercase">
                  Married filing jointly
                </p>
                <Row label="Original Tax Credit" value="$1,570" />
                <Row label="Overflow Tax Credit" value="$1,561" />
                <Separator className="bg-primary-foreground/20" />
                <Row label="Combined Maximum" value="$3,131" highlight />
              </div>

              <Link
                href="/donate/detailed"
                className={cn(
                  buttonVariants({ variant: "cta", size: "lg" }),
                  "flex h-11 w-full items-center justify-center gap-2 text-base"
                )}
              >
                Donate Now
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function HomeWhoWeServe() {
  return (
    <section className="bg-background py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
          Who we serve
        </p>
        <h2 className="mt-2 font-heading text-2xl font-semibold text-primary sm:text-3xl md:text-4xl">
          Built for Donors, Parents &amp; Schools
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Whether you want to give, receive, or partner — Arizona Christian Tuition has
          resources tailored to your role.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {whoWeServe.map(({ icon: Icon, title, description, links }) => (
            <Card
              key={title}
              className="border border-slate-200 bg-slate-50/80 shadow-sm dark:border-border dark:bg-card"
            >
              <CardContent className="p-6">
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 font-heading text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                <ul className="mt-6 space-y-0 divide-y divide-border">
                  {links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="flex items-center justify-between py-3 text-sm font-medium text-foreground hover:text-primary"
                      >
                        {l.label}
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomePreFooterCta() {
  return (
    <>
      <section
        className={cn(
          "bg-primary py-12 text-primary-foreground sm:py-16",
          /* Dark: shadcn --primary is near-white; keep ACT navy band + light copy */
          "dark:bg-[oklch(0.3_0.09_264)] dark:text-white"
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-act-red uppercase">
              Arizona Tax Credit — A.R.S. § 43-1089
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">
              Give Today. Owe Less in April.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/85 sm:text-base dark:text-white/85">
              Singles can redirect up to $1,459 and married couples up to $2,918 of Arizona
              state taxes to certified Christian school scholarships — completely
              dollar-for-dollar.
            </p>
          </div>
          <Link
            href="/campaigns"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "h-12 shrink-0 border-0 bg-white px-6 text-slate-900 shadow-sm hover:bg-white/90",
              /* Dark: --foreground is light; force dark label on white pill */
              "dark:text-slate-900"
            )}
          >
            Donate Today
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
      <div className="h-2 bg-sky-200/80 dark:bg-sky-900/50" aria-hidden />
    </>
  );
}

export function HomeBelowHero() {
  return (
    <>
      <HomeImpactStats />
      <HomeNewCampaigns />
      <HomeFeaturedCampaigns />
      <HomeBrowseSchoolTypes />
      <HomeGainingMomentum />
      <HomeHowTaxCreditWorks />
      <HomeHowItWorksSplit />
      <HomeWhoWeServe />
      <HomePreFooterCta />
    </>
  );
}
