import type { Metadata } from "next";

import { PreferencesCenter } from "@/components/consent/consent-forms";
import { ConsentShell } from "@/components/consent/consent-shell";

export const metadata: Metadata = { title: "Communication Preferences", description: "Manage your ACTSTO.ORG email and SMS preferences." };

export default function CommunicationPreferencesPage() {
  return (
    <ConsentShell title="Communication preferences" subtitle="Look up your email or phone to manage exactly what ACTSTO sends you — or unsubscribe entirely.">
      <PreferencesCenter />
    </ConsentShell>
  );
}
