import type { Metadata } from "next";
import Link from "next/link";

import { TaxCreditWizard } from "@/components/donate/tax-credit-wizard";

export const metadata: Metadata = {
  title: "Corporate tax credit donation",
  description:
    "Give through Arizona's corporate tax credit for low-income or disabled and displaced student scholarships.",
};

export default function BusinessDonationPage() {
  return (
    <div className="bg-background pb-16">
      <TaxCreditWizard mode="business" />
      <p className="mx-auto max-w-3xl px-4 text-sm text-muted-foreground sm:px-6">
        Giving personally instead?{" "}
        <Link href="/donate/detailed?as=individual" className="text-primary underline-offset-4 hover:underline">
          Use the individual tax credit form
        </Link>
        .
      </p>
    </div>
  );
}
