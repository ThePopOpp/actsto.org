import type { Metadata } from "next";

import { SmsOptInForm } from "@/components/consent/consent-forms";
import { ConsentShell } from "@/components/consent/consent-shell";

export const metadata: Metadata = { title: "SMS Opt-In", description: "Opt in to ACTSTO.ORG text messages." };

export default function SmsOptInPage() {
  return (
    <ConsentShell
      title="Get ACTSTO text messages"
      subtitle="Receive campaign updates, donor and account alerts, appointment and event reminders, and support responses — only when you ask for them."
    >
      <SmsOptInForm />
    </ConsentShell>
  );
}
