import type { Metadata } from "next";
import { format } from "date-fns";

import { CommunicationDocumentBody } from "@/components/legal/bodies/communication-body";
import { LEGAL_BODY_CLASS } from "@/components/legal/legal-body-class";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { SanitizedLegalHtml } from "@/components/legal/sanitized-legal-html";
import { getPublicLegalHtml } from "@/lib/legal/get-public-legal";

export const metadata: Metadata = { title: "Communication policy" };

export default async function CommunicationPolicyPage() {
  const { html, updatedAt } = await getPublicLegalHtml("communication");
  const lastUpdated = updatedAt ? format(updatedAt, "MMMM d, yyyy") : "April 1, 2026";

  return (
    <LegalPageShell title="Communication policy" lastUpdated={lastUpdated}>
      {html != null ? (
        <SanitizedLegalHtml html={html} />
      ) : (
        <div className={LEGAL_BODY_CLASS}>
          <CommunicationDocumentBody />
        </div>
      )}
    </LegalPageShell>
  );
}
