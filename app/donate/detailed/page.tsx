import type { Metadata } from "next";
import Link from "next/link";

import { TaxCreditWizard } from "@/components/donate/tax-credit-wizard";
import { getActSession } from "@/lib/auth/session-server";
import { getDonorPrefill } from "@/lib/donations/prefill-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tax credit donation",
  description: "Multi-step Arizona STO tax credit donation form.",
};

/**
 * A signed-in business account is switched to the corporate form automatically;
 * ?as=individual keeps the personal form for someone giving as themselves.
 */
export default async function DetailedDonationPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as } = await searchParams;
  const session = await getActSession().catch(() => null);
  const prefill = session?.email ? await getDonorPrefill(session).catch(() => null) : null;
  return (
    <div className="bg-background pb-16">
      <TaxCreditWizard mode={as === "individual" ? "individual" : undefined} prefill={prefill} />
      <p className="mx-auto max-w-3xl px-4 text-sm text-muted-foreground sm:px-6">
        Giving on behalf of a business?{" "}
        <Link href="/donate/business" className="text-primary underline-offset-4 hover:underline">
          Use the corporate tax credit form
        </Link>
        .
      </p>
    </div>
  );
}
