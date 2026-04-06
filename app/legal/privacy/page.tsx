import type { Metadata } from "next";
import { format } from "date-fns";

import { PrivacyDocumentBody } from "@/components/legal/bodies/privacy-body";
import { LEGAL_BODY_CLASS } from "@/components/legal/legal-body-class";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { SanitizedLegalHtml } from "@/components/legal/sanitized-legal-html";
import { getPublicLegalHtml } from "@/lib/legal/get-public-legal";

export const metadata: Metadata = { title: "Privacy policy" };

export default async function PrivacyPage() {
  const { html, updatedAt } = await getPublicLegalHtml("privacy");
  const lastUpdated = updatedAt ? format(updatedAt, "MMMM d, yyyy") : "April 1, 2026";

  return (
    <LegalPageShell title="Privacy policy" lastUpdated={lastUpdated}>
      {html != null ? (
        <SanitizedLegalHtml html={html} />
      ) : (
        <div className={LEGAL_BODY_CLASS}>
          <PrivacyDocumentBody />
        </div>
      )}
    </LegalPageShell>
  );
}
