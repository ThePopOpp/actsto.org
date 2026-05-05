import type { Metadata } from "next";

import { CommunicationDocumentBody } from "@/components/legal/bodies/communication-body";
import { LEGAL_BODY_CLASS } from "@/components/legal/legal-body-class";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = { title: "Communication policy" };

export default function CommunicationPolicyPage() {
  return (
    <LegalPageShell title="Communication policy" lastUpdated="April 1, 2026">
      <div className={LEGAL_BODY_CLASS}>
        <CommunicationDocumentBody />
      </div>
    </LegalPageShell>
  );
}
