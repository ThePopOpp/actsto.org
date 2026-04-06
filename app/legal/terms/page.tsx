import type { Metadata } from "next";
import { format } from "date-fns";

import { TermsDocumentBody } from "@/components/legal/bodies/terms-body";
import { LEGAL_BODY_CLASS } from "@/components/legal/legal-body-class";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { SanitizedLegalHtml } from "@/components/legal/sanitized-legal-html";
import { getPublicLegalHtml } from "@/lib/legal/get-public-legal";

export const metadata: Metadata = { title: "Terms of service" };

export default async function TermsPage() {
  const { html, updatedAt } = await getPublicLegalHtml("terms");
  const lastUpdated = updatedAt ? format(updatedAt, "MMMM d, yyyy") : "April 1, 2026";

  return (
    <LegalPageShell title="Terms of service" lastUpdated={lastUpdated}>
      {html != null ? (
        <SanitizedLegalHtml html={html} />
      ) : (
        <div className={LEGAL_BODY_CLASS}>
          <TermsDocumentBody />
        </div>
      )}
    </LegalPageShell>
  );
}
