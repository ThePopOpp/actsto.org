import type { Metadata } from "next";

import { TaxCreditWizard } from "@/components/donate/tax-credit-wizard";

export const metadata: Metadata = {
  title: "Tax credit donation",
  description: "Multi-step Arizona STO tax credit donation form.",
};

export default function DetailedDonationPage() {
  return (
    <div className="bg-background pb-16">
      <TaxCreditWizard />
    </div>
  );
}
