/**
 * Turn-key social templates. Client-safe. Each builder returns a block document
 * (shared block model) pre-filled from a campaign, ready to tweak in the composer.
 */

import type { BlogBlock, BlogBlockProps } from "@/lib/blog/blocks";

export type SocialTemplateCampaign = {
  title: string;
  slug: string;
  tagline?: string | null;
  excerpt?: string | null;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  percent: number;
  featuredImageUrl?: string | null;
  location?: string | null;
};

export type SocialTemplateDef = {
  id: string;
  label: string;
  description: string;
  /** Suggested background for the canvas. */
  bg: string;
};

export const SOCIAL_TEMPLATES: SocialTemplateDef[] = [
  { id: "support", label: "Support the Campaign", description: "Photo, headline, and a donate CTA.", bg: "#0b1220" },
  { id: "progress", label: "Goal Progress", description: "Amount raised toward the goal.", bg: "#0b1220" },
  { id: "meet", label: "Meet the Student", description: "Photo-forward introduction.", bg: "#0f172a" },
  { id: "thanks", label: "Thank You", description: "Gratitude to donors.", bg: "#111827" },
];

let seq = 0;
function id() {
  seq += 1;
  return `b-${Date.now().toString(36)}-${seq}`;
}
function block(type: BlogBlock["type"], props: BlogBlockProps): BlogBlock {
  return { id: id(), type, props };
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function campaignUrl(slug: string, siteUrl: string) {
  return `${siteUrl.replace(/\/$/, "")}/campaigns/${slug}`;
}

/** Build a template's blocks from a campaign. */
export function buildTemplateBlocks(templateId: string, c: SocialTemplateCampaign, siteUrl: string): BlogBlock[] {
  const url = campaignUrl(c.slug, siteUrl);
  const white = "#ffffff";
  const gold = "#c8a35a";
  const img = c.featuredImageUrl
    ? block("image", { src: c.featuredImageUrl, alt: c.title, imgWidth: "100%", align: "center", marginBottom: 28 })
    : null;

  switch (templateId) {
    case "progress":
      return [
        block("heading", { level: "h2", content: "Help us reach our goal", align: "center", color: gold, fontSize: 40, marginBottom: 12 }),
        block("heading", { level: "h1", content: c.title, align: "center", color: white, fontSize: 64, marginBottom: 20 }),
        block("heading", { level: "h1", content: `${money(c.raisedAmount)} raised of ${money(c.goalAmount)}`, align: "center", color: white, fontSize: 48, marginBottom: 10 }),
        block("paragraph", { content: `${c.percent}% funded · ${c.donorCount} donors`, align: "center", color: "#cbd5e1" }),
        block("button", { buttonText: "Give now", buttonUrl: url, buttonBgColor: gold, buttonColor: "#111827", align: "center", marginTop: 28 }),
      ];
    case "meet":
      return [
        ...(img ? [img] : []),
        block("heading", { level: "h1", content: c.title, align: "center", color: white, fontSize: 60, marginBottom: 16 }),
        block("paragraph", { content: c.tagline || c.excerpt || "Help provide a Christ-centered education.", align: "center", color: "#e2e8f0", fontSize: 28 } as BlogBlockProps),
        block("button", { buttonText: "Read their story", buttonUrl: url, buttonBgColor: gold, buttonColor: "#111827", align: "center", marginTop: 24 }),
      ];
    case "thanks":
      return [
        block("heading", { level: "h2", content: "Thank you", align: "center", color: gold, fontSize: 44, marginBottom: 12 }),
        block("heading", { level: "h1", content: `${c.donorCount} donors are changing a life`, align: "center", color: white, fontSize: 56, marginBottom: 18 }),
        block("paragraph", { content: `Together we've raised ${money(c.raisedAmount)} for ${c.title}.`, align: "center", color: "#e2e8f0", fontSize: 28 } as BlogBlockProps),
        block("button", { buttonText: "Join them", buttonUrl: url, buttonBgColor: gold, buttonColor: "#111827", align: "center", marginTop: 24 }),
      ];
    case "support":
    default:
      return [
        ...(img ? [img] : []),
        block("heading", { level: "h1", content: c.title, align: "center", color: white, fontSize: 60, marginBottom: 16 }),
        block("paragraph", { content: c.tagline || c.excerpt || "Turn your Arizona tax dollars into a Christ-centered education.", align: "center", color: "#e2e8f0", fontSize: 28 } as BlogBlockProps),
        block("button", { buttonText: "Support this campaign", buttonUrl: url, buttonBgColor: gold, buttonColor: "#111827", align: "center", marginTop: 24 }),
      ];
  }
}

/** Suggested caption text for a campaign post. */
export function buildCaption(c: SocialTemplateCampaign, siteUrl: string): string {
  return `${c.title} — ${c.tagline || "Help provide a Christ-centered education through Arizona's tax-credit program."}\n\n${money(c.raisedAmount)} raised of ${money(c.goalAmount)} (${c.percent}%). Give today: ${campaignUrl(c.slug, siteUrl)}\n\n#ArizonaTaxCredit #ChristianEducation #ACTSTO`;
}
