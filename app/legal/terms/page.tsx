import type { Metadata } from "next";

import { TermsDocumentBody } from "@/components/legal/bodies/terms-body";
import { LEGAL_BODY_CLASS } from "@/components/legal/legal-body-class";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of service" lastUpdated="April 1, 2026">
      <div className={LEGAL_BODY_CLASS}>
        <TermsDocumentBody />
      </div>
    </LegalPageShell>
  );
}
