/**
 * Turns a campaign into the handful of facts every marketing piece needs.
 *
 * Everything downstream — emails, postcards, social — reads from this one shape,
 * so a campaign edit shows up everywhere at once and no channel invents its own
 * version of "how much is left to raise".
 *
 * Client-safe: no Prisma, no env, no server-only imports.
 */

import type { Campaign } from "@/lib/campaigns";

export type MarketingContent = {
  slug: string;
  title: string;
  tagline: string;
  excerpt: string;
  description: string;
  /** Absolute campaign URL, used for links and QR codes. */
  url: string;
  donateUrl: string;
  imageUrl: string;
  studentFirstName: string;
  /** "Jace" or "Jace and Ellie" — safe to drop into a sentence. */
  studentNames: string;
  gradeDisplay: string;
  schoolName: string;
  parentName: string;
  parentEmail: string;
  goal: number;
  raised: number;
  remaining: number;
  percent: number;
  donorCount: number;
  daysLeft: number;
  endDate: string;
};

function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://actsto.org";
}

/** "Jace", "Jace and Ellie", "Jace, Ellie and Sam". */
export function joinNames(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

export function buildMarketingContent(campaign: Campaign, origin = siteOrigin()): MarketingContent {
  const base = origin.replace(/\/$/, "");
  const url = `${base}/campaigns/${campaign.slug}`;
  const students = campaign.students ?? [];
  const goal = Math.max(0, campaign.goal ?? 0);
  const raised = Math.max(0, campaign.raised ?? 0);

  return {
    slug: campaign.slug,
    title: campaign.title,
    tagline: campaign.tagline ?? "",
    excerpt: campaign.excerpt ?? "",
    description: campaign.description ?? "",
    url,
    donateUrl: `${url}?give=1`,
    imageUrl: campaign.image ?? "",
    studentFirstName: students[0]?.nickname?.trim() || students[0]?.firstName?.trim() || "our student",
    studentNames:
      joinNames(students.map((s) => s.nickname?.trim() || s.firstName?.trim() || "")) || "our student",
    gradeDisplay: students[0]?.gradeDisplay ?? "",
    schoolName: campaign.school?.name ?? students[0]?.school ?? "",
    parentName: campaign.parent?.name ?? "",
    parentEmail: campaign.parent?.email ?? "",
    goal,
    raised,
    remaining: Math.max(0, goal - raised),
    // Guard the divide: a campaign with no goal set would otherwise render NaN%.
    percent: goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0,
    donorCount: campaign.donorCount ?? 0,
    daysLeft: Math.max(0, campaign.daysLeft ?? 0),
    endDate: campaign.endDate ?? "",
  };
}

export function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}
