import "server-only";

import { prisma } from "@/lib/prisma";
import type { CtaPlacement, SiteCtaBlockData } from "@/lib/site-cta-block-types";
import { TAX_CREDIT_MAX } from "@/lib/tax-credit";

export type { CtaPlacement, SiteCtaBlockData } from "@/lib/site-cta-block-types";

const IS_PRODUCTION_BUILD = process.env.NEXT_PHASE === "phase-production-build";

export const DEFAULT_CTA_BLOCKS: SiteCtaBlockData[] = [
  {
    key: "home-hero-v1",
    placement: "home_hero",
    heading: "Turn Your Arizona Taxes Into Private Christian Education & Tuition",
    subheading:
      "Your state tax dollars can fund a child's education instead of the general fund. Through Arizona's tax credit program, you can give and get back.",
    primaryLabel: "Get Started",
    primaryUrl: "/register",
    primaryVariant: "default",
    showSecondary: true,
    secondaryLabel: "Donate Today",
    secondaryUrl: "/campaigns",
    padding: "spacious",
    visible: true,
    useGradient: false,
    sortOrder: 10,
  },
  {
    key: "home-new-campaigns-v1",
    placement: "home_new_campaigns",
    heading: "New Student Campaigns",
    subheading: "Active campaigns",
    primaryLabel: "Start a Campaign",
    primaryUrl: "/campaigns/new",
    primaryVariant: "outline",
    showSecondary: false,
    padding: "default",
    visible: true,
    useGradient: false,
    sortOrder: 20,
  },
  {
    key: "home-pre-footer-v1",
    placement: "home_pre_footer",
    heading: "Give Today. Owe Less in April.",
    subheading: "Arizona Tax Credit - A.R.S. § 43-1089",
    body:
      `Singles can redirect up to $${TAX_CREDIT_MAX["2026"].single.toLocaleString()} and married couples up to $${TAX_CREDIT_MAX["2026"].married.toLocaleString()} of Arizona state taxes to certified Christian school scholarships.`,
    primaryLabel: "Donate Today",
    primaryUrl: "/campaigns",
    primaryVariant: "secondary",
    showSecondary: false,
    bgColor: "var(--primary)",
    padding: "default",
    visible: true,
    useGradient: false,
    sortOrder: 30,
  },
  {
    key: "blog-archive-bottom-v1",
    placement: "blog_archive_bottom",
    heading: "Ready to fund a Christ-centered education?",
    body:
      "Start a campaign for your family, make a tax-credit gift, or explore active fundraisers on Arizona Christian Tuition-all in one place.",
    primaryLabel: "Create an account",
    primaryUrl: "/register",
    primaryVariant: "default",
    showSecondary: true,
    secondaryLabel: "Browse campaigns",
    secondaryUrl: "/campaigns",
    bgColor: "#e8eef7",
    padding: "default",
    visible: true,
    useGradient: true,
    bgColorEnd: "#ffffff",
    sortOrder: 40,
  },
  {
    key: "campaigns-top-v1",
    placement: "campaigns_top",
    heading: "Support a student today",
    body: "Browse active student campaigns and give through Arizona Christian Tuition.",
    primaryLabel: "Start a Campaign",
    primaryUrl: "/campaigns/new",
    primaryVariant: "outline",
    showSecondary: false,
    padding: "compact",
    visible: true,
    useGradient: false,
    sortOrder: 45,
  },
  {
    key: "how-it-works-hero-v1",
    placement: "how_it_works_hero",
    heading: "How It Works",
    subheading:
      "From application to impact, we make Christian school funding straightforward and stress-free.",
    primaryLabel: "Start a campaign",
    primaryUrl: "/campaigns/new",
    primaryVariant: "cta",
    showSecondary: true,
    secondaryLabel: "Donate today",
    secondaryUrl: "/campaigns",
    padding: "spacious",
    visible: true,
    useGradient: false,
    sortOrder: 50,
  },
  {
    key: "how-it-works-bottom-v1",
    placement: "how_it_works_bottom",
    heading: "Every Gift Plants a Seed of Faith",
    subheading: "Join the mission",
    body:
      "Whether you're a family in need or a believer ready to give, Arizona Christian Tuition is the bridge between generosity and opportunity.",
    primaryLabel: "Donate to a campaign",
    primaryUrl: "/campaigns",
    primaryVariant: "cta",
    showSecondary: true,
    secondaryLabel: "Start a campaign",
    secondaryUrl: "/campaigns/new",
    padding: "default",
    visible: true,
    useGradient: false,
    sortOrder: 60,
  },
  {
    key: "how-it-works-individuals-v1",
    placement: "how_it_works_individuals",
    heading: "Individuals",
    body: "Review tax credit limits, then give or talk with our team when you are ready.",
    primaryLabel: "Give now",
    primaryUrl: "/donate/detailed",
    primaryVariant: "default",
    showSecondary: true,
    secondaryLabel: "Talk to our team",
    secondaryUrl: "/contact",
    padding: "default",
    visible: true,
    useGradient: false,
    sortOrder: 65,
  },
  {
    key: "about-hero-v1",
    placement: "about_hero",
    heading: "About Arizona Christian Tuition",
    body:
      "Arizona Christian Tuition was founded by Arizona dads who believed every family deserves access to private Christian education.",
    primaryLabel: "Get started",
    primaryUrl: "/register",
    primaryVariant: "default",
    showSecondary: true,
    secondaryLabel: "Support a campaign",
    secondaryUrl: "/campaigns",
    padding: "spacious",
    visible: true,
    useGradient: false,
    sortOrder: 70,
  },
  {
    key: "about-mid-v1",
    placement: "about_mid",
    heading: "Join families, schools, and donors making tuition possible",
    body:
      "Whether you are applying for a scholarship, recommending a student, or giving through Arizona tax credits, we are here to help you take the next step with confidence.",
    primaryLabel: "Talk to our team",
    primaryUrl: "/contact",
    primaryVariant: "default",
    showSecondary: true,
    secondaryLabel: "Read the FAQ",
    secondaryUrl: "/faq",
    padding: "default",
    visible: true,
    useGradient: false,
    sortOrder: 75,
  },
  {
    key: "about-bottom-v1",
    placement: "about_bottom",
    heading: "Ready to put your taxes to work for Christian education?",
    body:
      "Create an account to apply, donate, or launch a campaign-three minutes can change a student's school year.",
    primaryLabel: "Get started free",
    primaryUrl: "/register",
    primaryVariant: "secondary",
    showSecondary: true,
    secondaryLabel: "Browse campaigns",
    secondaryUrl: "/campaigns",
    padding: "default",
    visible: true,
    useGradient: false,
    sortOrder: 80,
  },
  {
    key: "site-header-primary-v1",
    placement: "site_header_primary",
    heading: "Header primary CTA",
    primaryLabel: "Get Started",
    primaryUrl: "/register",
    primaryVariant: "default",
    showSecondary: false,
    padding: "compact",
    visible: true,
    useGradient: false,
    sortOrder: 90,
  },
  {
    key: "site-header-secondary-v1",
    placement: "site_header_secondary",
    heading: "Header secondary CTA",
    primaryLabel: "Start Campaign",
    primaryUrl: "/campaigns/new",
    primaryVariant: "outline",
    showSecondary: false,
    padding: "compact",
    visible: true,
    useGradient: false,
    sortOrder: 100,
  },
  {
    key: "site-header-mobile-extra-v1",
    placement: "site_header_mobile_extra",
    heading: "Header mobile extra CTA",
    primaryLabel: "Donate Today",
    primaryUrl: "/campaigns",
    primaryVariant: "outline",
    showSecondary: false,
    padding: "compact",
    visible: false,
    useGradient: false,
    sortOrder: 110,
  },
];

export function normalizeCtaBlock(input: Partial<SiteCtaBlockData> & { key: string }): SiteCtaBlockData {
  return {
    key: input.key.trim(),
    placement: input.placement ?? "custom_path",
    path: input.path ?? null,
    heading: input.heading?.trim() || "CTA block",
    subheading: input.subheading?.trim() || null,
    body: input.body?.trim() || null,
    primaryLabel: input.primaryLabel?.trim() || "Learn more",
    primaryUrl: input.primaryUrl?.trim() || "/",
    primaryVariant: input.primaryVariant?.trim() || "default",
    showSecondary: input.showSecondary ?? false,
    secondaryLabel: input.secondaryLabel?.trim() || null,
    secondaryUrl: input.secondaryUrl?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    imageAlt: input.imageAlt?.trim() || null,
    bgColor: input.bgColor?.trim() || null,
    bgColorEnd: input.bgColorEnd?.trim() || null,
    useGradient: input.useGradient ?? false,
    textColor: input.textColor?.trim() || null,
    padding: input.padding ?? "default",
    visible: input.visible ?? true,
    sortOrder: input.sortOrder ?? 0,
  };
}

export async function getAllCtaBlocks() {
  if (IS_PRODUCTION_BUILD) return DEFAULT_CTA_BLOCKS;

  const rows = await prisma.siteCtaBlock.findMany({ orderBy: [{ sortOrder: "asc" }, { key: "asc" }] }).catch(() => []);
  const persisted = new Map(rows.map((row) => [row.key, normalizeCtaBlock(row)]));
  for (const fallback of DEFAULT_CTA_BLOCKS) {
    if (!persisted.has(fallback.key)) persisted.set(fallback.key, fallback);
  }
  return Array.from(persisted.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
}

export async function getCtaBlock(key: string) {
  if (IS_PRODUCTION_BUILD) return DEFAULT_CTA_BLOCKS.find((block) => block.key === key) ?? null;

  const row = await prisma.siteCtaBlock.findUnique({ where: { key } }).catch(() => null);
  if (row) return normalizeCtaBlock(row);
  return DEFAULT_CTA_BLOCKS.find((block) => block.key === key) ?? null;
}

export async function getCtaBlockByPlacement(placement: CtaPlacement | string) {
  const rows = await getAllCtaBlocks();
  return rows.find((block) => block.placement === placement && block.visible) ?? null;
}
