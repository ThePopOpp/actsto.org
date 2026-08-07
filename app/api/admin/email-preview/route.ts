import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { EMAIL_CATALOG, EMAIL_CATEGORY_LABELS, type EmailCategory } from "@/lib/email/catalog";
import {
  buildCampaignCompleteEmail,
  type CampaignCompleteAudience,
} from "@/lib/email/templates/campaign-complete";
import {
  SAMPLE_CAMPAIGN,
  SAMPLE_FEATURED,
  buildCampaignClosingEmail,
  buildDonationReceivedEmail,
  buildFeaturedCampaignsEmail,
  buildGoalMilestoneEmail,
  buildNewCampaignEmail,
  buildToolSpotlightEmail,
  type BuiltEmail,
} from "@/lib/email/templates/campaign-emails";
import { buildWelcomeEmail, type WelcomeRole } from "@/lib/email/templates/welcome";
import { escapeHtml } from "@/lib/email/templates/layout";

/**
 * Render any email in the browser, without sending anything.
 *
 * The only reliable way to judge an email is to look at it. Super Admin only —
 * these render real names and figures once wired to live data.
 *
 *   /api/admin/email-preview                     → index of everything
 *   /api/admin/email-preview?t=campaign-closing&window=1-week
 *   /api/admin/email-preview?t=welcome&role=parent
 */
export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const template = url.searchParams.get("t");
  const firstName = url.searchParams.get("name") ?? "Jeremy";

  if (!template) return html(renderIndex());

  const built = buildPreview(template, url, firstName);
  if (!built) {
    return NextResponse.json(
      { error: `Unknown template "${template}". Open /api/admin/email-preview for the index.` },
      { status: 400 },
    );
  }
  return html(built.html);
}

function html(body: string) {
  return new NextResponse(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function buildPreview(template: string, url: URL, firstName: string): BuiltEmail | null {
  const campaign = SAMPLE_CAMPAIGN;

  switch (template) {
    case "welcome": {
      const role = (url.searchParams.get("role") ?? "parent") as WelcomeRole;
      const { html: body, subject } = buildWelcomeEmail({ role, firstName });
      return { subject: subject ?? "Welcome", html: body, text: "" };
    }
    case "campaign-complete": {
      const audience = (url.searchParams.get("audience") ?? "parent") as CampaignCompleteAudience;
      const funded = url.searchParams.get("funded") !== "0";
      const { html: body, subject } = buildCampaignCompleteEmail({
        audience,
        firstName,
        stats: {
          campaignTitle: campaign.title,
          campaignUrl: campaign.url,
          studentNames: campaign.studentNames,
          goalAmount: campaign.goal,
          raisedAmount: funded ? campaign.goal + 750 : campaign.raised,
          donorCount: funded ? 34 : campaign.donorCount,
          daysRunning: 86,
          featuredImageUrl: campaign.imageUrl ?? null,
        },
      });
      return { subject: subject ?? "Campaign complete", html: body, text: "" };
    }
    case "campaign-closing":
      return buildCampaignClosingEmail({
        window: url.searchParams.get("window") === "30-days" ? "30-days" : "1-week",
        audience: url.searchParams.get("audience") === "supporter" ? "supporter" : "owner",
        firstName,
        campaign:
          url.searchParams.get("window") === "30-days"
            ? { ...campaign, daysLeft: 30 }
            : campaign,
      });
    case "goal-milestone": {
      const raw = Number(url.searchParams.get("milestone") ?? 50);
      const allowed: (25 | 50 | 75 | 100)[] = [25, 50, 75, 100];
      const milestone = allowed.find((m) => m === raw) ?? 50;
      return buildGoalMilestoneEmail({
        milestone,
        firstName,
        campaign:
          milestone === 100
            ? { ...campaign, raised: campaign.goal + 400, donorCount: 41 }
            : { ...campaign, raised: Math.round((campaign.goal * milestone) / 100) },
      });
    }
    case "donation-received":
      return buildDonationReceivedEmail({
        firstName,
        campaign,
        amount: 250,
        donorName: url.searchParams.get("anon") === "1" ? null : "Marcus Bell",
        donorMessage: "Praying for Jace this year — go get it.",
        isFirst: url.searchParams.get("first") === "1",
      });
    case "new-campaign":
      return buildNewCampaignEmail({
        firstName,
        campaign: { ...campaign, raised: 0, donorCount: 0, daysLeft: 74 },
        excerpt:
          "Jace is growing into a young man with a big heart and a real curiosity for how things work. We're raising tuition so he can keep learning somewhere that takes both seriously.",
      });
    case "featured-campaigns":
      return buildFeaturedCampaignsEmail({
        firstName,
        campaigns: SAMPLE_FEATURED,
        totals: { studentsSupported: 214, raisedThisMonth: 148300 },
      });
    case "tool-spotlight":
      return buildToolSpotlightEmail({
        firstName,
        toolName: "The marketing builder",
        summary:
          "Build a postcard, an email or a social post from your campaign — the photo, the totals and the link fill themselves in.",
        howItWorks: [
          {
            title: "Pick a template",
            body: "Open Marketing in your dashboard and choose a starting point. Each one already has your campaign in it.",
          },
          {
            title: "Change what you want",
            body: "Drag blocks around, swap the photo, rewrite the headline. Nothing is locked.",
          },
          {
            title: "Take it with you",
            body: "Download a PDF for the printer, a PNG for Instagram, or copy the email straight into Gmail.",
          },
        ],
        ctaUrl: "https://actsto.org/dashboard/parent/marketing",
        ctaLabel: "Open the marketing builder",
      });
    default:
      return null;
  }
}

/** Previewable variants, keyed by the `t` value that renders them. */
const PREVIEWS: Record<string, { label: string; query: string }[]> = {
  welcome_parent: [{ label: "Parent", query: "t=welcome&role=parent" }],
  welcome_student: [{ label: "Student", query: "t=welcome&role=student" }],
  welcome_individual_donor: [
    { label: "Individual donor", query: "t=welcome&role=donor_individual" },
  ],
  welcome_business_donor: [{ label: "Business donor", query: "t=welcome&role=donor_business" }],
  campaign_new_live: [{ label: "Preview", query: "t=new-campaign" }],
  campaign_goal_milestone: [
    { label: "25%", query: "t=goal-milestone&milestone=25" },
    { label: "50%", query: "t=goal-milestone&milestone=50" },
    { label: "75%", query: "t=goal-milestone&milestone=75" },
    { label: "Fully funded", query: "t=goal-milestone&milestone=100" },
  ],
  campaign_ending_30_days: [
    { label: "To the family", query: "t=campaign-closing&window=30-days" },
    { label: "To a supporter", query: "t=campaign-closing&window=30-days&audience=supporter" },
  ],
  campaign_ending_1_week: [
    { label: "To the family", query: "t=campaign-closing&window=1-week" },
    { label: "To a supporter", query: "t=campaign-closing&window=1-week&audience=supporter" },
  ],
  campaign_complete_parent: [{ label: "Funded", query: "t=campaign-complete&audience=parent" }],
  campaign_complete_student: [{ label: "Funded", query: "t=campaign-complete&audience=student" }],
  campaign_complete_individual_donor: [
    { label: "Funded", query: "t=campaign-complete&audience=donor_individual" },
    { label: "Short of goal", query: "t=campaign-complete&audience=donor_individual&funded=0" },
  ],
  campaign_complete_business_donor: [
    { label: "Funded", query: "t=campaign-complete&audience=donor_business" },
  ],
  donation_received_owner: [{ label: "Preview", query: "t=donation-received" }],
  donation_first_gift: [{ label: "First gift", query: "t=donation-received&first=1" }],
  featured_campaigns_digest: [{ label: "Preview", query: "t=featured-campaigns" }],
  product_tool_spotlight: [{ label: "Preview", query: "t=tool-spotlight" }],
};

/**
 * An index of the whole catalogue, with what's previewable linked and what
 * isn't marked plainly. A list that quietly omits the unbuilt ones would read
 * as "all done".
 */
function renderIndex(): string {
  const categories = Object.keys(EMAIL_CATEGORY_LABELS) as EmailCategory[];

  const sections = categories
    .map((category) => {
      const entries = EMAIL_CATALOG.filter((e) => e.category === category);
      if (entries.length === 0) return "";
      const rows = entries
        .map((entry) => {
          const previews = PREVIEWS[entry.key] ?? [];
          const links = previews.length
            ? previews
                .map(
                  (p) =>
                    `<a href="?${p.query}" style="display:inline-block;margin:0 6px 6px 0;padding:5px 11px;border:1px solid #d8dde5;border-radius:7px;background:#fff;color:#001138;text-decoration:none;font-size:13px">${escapeHtml(p.label)}</a>`,
                )
                .join("")
            : `<span style="font-size:13px;color:#8c98a8">No preview yet</span>`;
          const gate = entry.preference
            ? `<span style="color:#5b6879">optional · ${escapeHtml(entry.preference)}</span>`
            : `<span style="color:#b21e2a;font-weight:600">required</span>`;
          return `
          <tr style="border-top:1px solid #e4e8ee">
            <td style="padding:14px 12px 14px 0;vertical-align:top;width:280px">
              <div style="font-weight:600;color:#131c2b">${escapeHtml(entry.name)}${entry.planned ? ` <span style="font-size:11px;font-weight:500;color:#8c98a8">· not wired yet</span>` : ""}</div>
              <div style="font-size:13px;color:#5b6879;margin-top:2px">${escapeHtml(entry.description)}</div>
              <code style="font-size:11px;color:#8c98a8">${escapeHtml(entry.key)}</code>
            </td>
            <td style="padding:14px 12px;vertical-align:top;font-size:13px;color:#5b6879;width:250px">
              ${escapeHtml(entry.trigger)}<br><span style="font-size:12px">${gate}</span>
            </td>
            <td style="padding:14px 0;vertical-align:top">${links}</td>
          </tr>`;
        })
        .join("");
      return `
      <h2 style="margin:34px 0 6px;font-family:Georgia,serif;font-size:20px;color:#001138">${escapeHtml(EMAIL_CATEGORY_LABELS[category])}</h2>
      <table style="width:100%;border-collapse:collapse">${rows}</table>`;
    })
    .join("");

  const previewable = Object.keys(PREVIEWS).length;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ACTSTO email catalogue</title></head>
<body style="margin:0;padding:32px 20px;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#131c2b">
<div style="max-width:1040px;margin:0 auto">
  <h1 style="margin:0;font-family:Georgia,serif;font-size:30px;color:#001138">Email catalogue</h1>
  <p style="margin:8px 0 0;color:#5b6879">
    ${EMAIL_CATALOG.length} emails defined · ${previewable} previewable ·
    ${EMAIL_CATALOG.filter((e) => e.preference === null).length} required, ${EMAIL_CATALOG.filter((e) => e.preference !== null).length} optional.
    Add <code>&amp;name=Sarah</code> to any preview to change the greeting.
  </p>
  ${sections}
</div>
</body></html>`;
}
