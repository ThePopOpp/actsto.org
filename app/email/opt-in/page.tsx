import type { Metadata } from "next";

import { EmailOptInForm } from "@/components/consent/consent-forms";
import { ConsentShell } from "@/components/consent/consent-shell";

export const metadata: Metadata = { title: "Email Sign-Up", description: "Subscribe to ACTSTO.ORG emails." };

export default function EmailOptInPage() {
  return (
    <ConsentShell title="Subscribe to ACTSTO emails" subtitle="Choose what you'd like to hear about. We'll send a confirmation link to verify your email.">
      <EmailOptInForm />
    </ConsentShell>
  );
}
