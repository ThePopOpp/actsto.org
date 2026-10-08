import type { Metadata } from "next";
import Link from "next/link";

import { normalizeSiteContentSettings, SITE_CONTENT_KEY } from "@/lib/admin/site-content-settings";
import { maxCampaignEndDate } from "@/lib/campaign-dates";
import { prisma } from "@/lib/prisma";
import { formatWindowDate } from "@/lib/scholarship/windows";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Award year timeline, tax-credit deadlines and guides for families, donors and schools working with Arizona Christian Tuition.",
};

export const dynamic = "force-dynamic";

type TimelineRow = { when: string; what: string; detail?: string };

const GUIDES: { audience: string; links: { href: string; label: string }[] }[] = [
  {
    audience: "Families",
    links: [
      { href: "/how-it-works", label: "How scholarships work" },
      { href: "/register/parent", label: "Create a parent account and apply" },
      { href: "/faq", label: "Parent questions" },
    ],
  },
  {
    audience: "Donors",
    links: [
      { href: "/donate/detailed", label: "Make a tax-credit gift" },
      { href: "/how-it-works", label: "How much can I give?" },
      { href: "/legal/terms/tax-disclosure", label: "Tax disclosure" },
    ],
  },
  {
    audience: "Schools and the public",
    links: [
      { href: "/scholarship-reporting", label: "Scholarship reporting by family income" },
      { href: "/contact", label: "Partner with us" },
      { href: "/legal/privacy", label: "Privacy policy" },
    ],
  },
];

/**
 * The award year as dates a family or donor can act on. Application windows are
 * staff-managed data, so the timeline moves when they do; the tax-credit and
 * campaign dates come from the same rules the donation and campaign forms use.
 */
async function buildTimeline(now: Date): Promise<TimelineRow[]> {
  const windows = await prisma.applicationWindow
    .findMany({
      where: { isPublished: true, closesAt: { gte: new Date(now.getFullYear() - 1, 0, 1) } },
      orderBy: { opensAt: "asc" },
      take: 3,
    })
    .catch(() => []);

  const dated: (TimelineRow & { at: Date })[] = windows.flatMap((w) => [
    {
      at: w.opensAt,
      when: formatWindowDate(w.opensAt),
      what: `${w.schoolYear} scholarship applications open`,
    },
    {
      at: w.closesAt,
      when: formatWindowDate(w.closesAt),
      what: `${w.schoolYear} scholarship applications close`,
      detail: "Submit before the deadline. Drafts can be saved and finished later.",
    },
  ]);

  // The next April 15 and September 30 from today, so the dates never go stale.
  const year = now.getFullYear();
  const nextDate = (month: number, day: number) => {
    const d = new Date(year, month, day, 23, 59);
    return d >= now ? d : new Date(year + 1, month, day, 23, 59);
  };
  const april15 = nextDate(3, 15);
  const sept30 = nextDate(8, 30);
  const [endY, endM, endD] = maxCampaignEndDate(null, now).split("-").map(Number);
  const campaignEnd = new Date(endY, endM - 1, endD);

  dated.push(
    {
      at: april15,
      when: formatWindowDate(april15),
      what: `Last day to make a gift that counts toward your ${april15.getFullYear() - 1} Arizona credit`,
      detail: "A.R.S. § 43-1089 lets gifts made by the filing deadline count for the prior tax year.",
    },
    {
      at: campaignEnd,
      when: formatWindowDate(campaignEnd),
      what: `Campaigns started in ${year} close`,
      detail: "Every campaign may run until June 30 of the year after it starts.",
    },
    {
      at: sept30,
      when: formatWindowDate(sept30),
      what: "Annual scholarship reporting is due",
      detail: "Prior-year scholarship totals by family income, per A.R.S. § 43-1503(B)(6).",
    },
  );
  return dated
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((row) => ({ when: row.when, what: row.what, detail: row.detail }));
}

export default async function ResourcesPage() {
  const now = new Date();
  const [settingsRow, timeline] = await Promise.all([
    prisma.siteContentSettings.findUnique({ where: { key: SITE_CONTENT_KEY } }).catch(() => null),
    buildTimeline(now),
  ]);
  const { resourcesBlog } = normalizeSiteContentSettings(settingsRow?.payload ?? null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <h1 className="font-heading text-3xl font-semibold text-primary sm:text-4xl">Resources</h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">{resourcesBlog.intro}</p>

      <section id="timeline" className="mt-10 scroll-mt-24">
        <h2 className="font-heading text-xl font-semibold text-primary">Award year timeline</h2>
        <ol className="mt-4 space-y-4 border-l border-border pl-5">
          {timeline.map((row) => (
            <li key={`${row.when}-${row.what}`} className="relative">
              <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary" aria-hidden />
              <p className="text-sm font-semibold tabular-nums text-foreground">{row.when}</p>
              <p className="text-sm text-foreground">{row.what}</p>
              {row.detail ? <p className="mt-0.5 text-xs text-muted-foreground">{row.detail}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 grid gap-8 sm:grid-cols-3">
        {GUIDES.map((group) => (
          <div key={group.audience}>
            <h2 className="font-heading text-lg font-semibold text-primary">{group.audience}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {group.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="text-primary underline-offset-4 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {resourcesBlog.blogUrl ? (
        <p className="mt-12 text-sm text-muted-foreground">
          More articles on the{" "}
          <a href={resourcesBlog.blogUrl} className="text-primary underline-offset-4 hover:underline">
            Arizona Christian Tuition blog
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
