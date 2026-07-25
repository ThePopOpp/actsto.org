import type { Metadata } from "next";

import { SmsOptOutForm } from "@/components/consent/consent-forms";
import { ConsentShell } from "@/components/consent/consent-shell";

export const metadata: Metadata = { title: "SMS Opt-Out", description: "Unsubscribe from ACTSTO.ORG text messages." };

export default function SmsOptOutPage() {
  return (
    <ConsentShell title="Unsubscribe from text messages" subtitle="Stop receiving SMS messages from Arizona Christian Tuition (ACTSTO.ORG).">
      <SmsOptOutForm />
    </ConsentShell>
  );
}
