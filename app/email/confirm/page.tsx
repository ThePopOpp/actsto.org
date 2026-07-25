import type { Metadata } from "next";

import { EmailConfirmClient } from "@/components/consent/consent-forms";
import { ConsentShell } from "@/components/consent/consent-shell";

export const metadata: Metadata = { title: "Confirm Subscription" };
export const dynamic = "force-dynamic";

export default async function EmailConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <ConsentShell title="Confirm your subscription" subtitle="Verifying your email confirmation link…">
      <EmailConfirmClient token={token ?? ""} />
    </ConsentShell>
  );
}
