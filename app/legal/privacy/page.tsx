import type { Metadata } from "next";

import { PrivacyDocumentBody } from "@/components/legal/bodies/privacy-body";
import { LEGAL_BODY_CLASS } from "@/components/legal/legal-body-class";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy policy" lastUpdated="April 1, 2026">
      <div className={LEGAL_BODY_CLASS}>
        <PrivacyDocumentBody />
      </div>
    </LegalPageShell>
  );
}
