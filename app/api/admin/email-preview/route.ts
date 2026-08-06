import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import {
  buildCampaignCompleteEmail,
  type CampaignCompleteAudience,
} from "@/lib/email/templates/campaign-complete";
import { buildWelcomeEmail, type WelcomeRole } from "@/lib/email/templates/welcome";

/**
 * Render an email template in the browser, without sending anything.
 *
 * The only reliable way to judge an email is to look at it. Super Admin only —
 * these render real names and figures once wired to live data.
 *
 *   /api/admin/email-preview?t=welcome&role=parent
 *   /api/admin/email-preview?t=campaign-complete&audience=parent&funded=1
 */
export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const template = url.searchParams.get("t") ?? "welcome";
  const firstName = url.searchParams.get("name") ?? "Jeremy";

  if (template === "welcome") {
    const role = (url.searchParams.get("role") ?? "parent") as WelcomeRole;
    const { html } = buildWelcomeEmail({ role, firstName });
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (template === "campaign-complete") {
    const audience = (url.searchParams.get("audience") ?? "parent") as CampaignCompleteAudience;
    const funded = url.searchParams.get("funded") !== "0";

    // Sample figures. Obviously placeholder, so nobody mistakes a preview for
    // a real campaign's numbers.
    const { html } = buildCampaignCompleteEmail({
      audience,
      firstName,
      stats: {
        campaignTitle: "The Sample Family",
        campaignUrl: `${(process.env.APP_URL ?? "https://actsto.org").replace(/\/$/, "")}/campaigns/sample-family`,
        studentNames: "Ava and Noah",
        goalAmount: 18500,
        raisedAmount: funded ? 19250 : 11400,
        donorCount: funded ? 34 : 19,
        daysRunning: 86,
        featuredImageUrl: null,
      },
    });
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return NextResponse.json(
    { error: "Unknown template. Try t=welcome or t=campaign-complete." },
    { status: 400 },
  );
}
