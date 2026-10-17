import type { Metadata } from "next";

import { AdorNotice } from "@/components/legal/ador-notice";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { SanitizedLegalHtml } from "@/components/legal/sanitized-legal-html";
import { AWARD_SUMMARY_TITLE } from "@/lib/award-policy/public-page";
import { publishedAwardSummary } from "@/lib/award-policy/public-page-server";
import { formatDate } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: AWARD_SUMMARY_TITLE,
  description: "How Arizona Christian Tuition awards scholarships: the public summary of our Scholarship Award Policy.",
};

/**
 * Public, no login: the summary of ACTSTO's Scholarship Award Policy, edited by
 * Super Admins with no deploy. Only the summary is public; the full policy is
 * kept in the Super Admin area and is never linked from here.
 */
export default async function HowWeAwardScholarshipsPage() {
  const page = await publishedAwardSummary();
  return (
    <LegalPageShell title={page?.title ?? AWARD_SUMMARY_TITLE} lastUpdated={page?.publishedAt ? formatDate(page.publishedAt) : undefined}>
      {page ? (
        <SanitizedLegalHtml html={page.bodyHtml} />
      ) : (
        <p className="mt-10 text-sm text-muted-foreground">
          Our summary of how we award scholarships is being updated and will be posted here shortly. Questions? Contact us at{" "}
          <a href="mailto:hello@actsto.org" className="text-primary underline-offset-4 hover:underline">
            hello@actsto.org
          </a>
          .
        </p>
      )}
      <AdorNotice className="mt-10" showLink={false} />
    </LegalPageShell>
  );
}
