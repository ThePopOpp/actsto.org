import type { Metadata } from "next";

import { EmailOptOutForm } from "@/components/consent/consent-forms";
import { ConsentShell } from "@/components/consent/consent-shell";

export const metadata: Metadata = { title: "Email Unsubscribe", description: "Unsubscribe from ACTSTO.ORG emails." };

export default function EmailOptOutPage() {
  return (
    <ConsentShell title="Unsubscribe from emails" subtitle="Stop marketing and update emails. You'll still receive essential account, donation, and tax-receipt notices.">
      <EmailOptOutForm />
    </ConsentShell>
  );
}
