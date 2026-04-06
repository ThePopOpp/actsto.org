import type { Metadata } from "next";
import Link from "next/link";

import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = { title: "Tax credit disclosure" };

export default function TaxDisclosurePage() {
  return (
    <LegalPageShell title="Tax credit disclosure" lastUpdated="March 30, 2026">
      <section>
        <h2>1. Purpose of this disclosure</h2>
        <p className="mt-3 text-muted-foreground">
          Arizona Christian Tuition (“ACT”) is a School Tuition Organization (“STO”) recognized under
          Arizona law. This page provides general information about Arizona’s individual and corporate
          private school tax credit programs as they relate to donations made through ACT. It is for
          informational purposes only and is{" "}
          <strong>not tax, legal, or financial advice</strong>.
        </p>
      </section>

      <section>
        <h2>2. Not a deduction — Arizona tax credits</h2>
        <p className="mt-3 text-muted-foreground">
          Qualifying contributions to a certified STO may be eligible for an Arizona{" "}
          <strong>tax credit</strong> (subject to annual caps and eligibility rules established by Arizona
          statute and the Arizona Department of Revenue). A credit generally reduces your Arizona tax
          liability dollar-for-dollar within applicable limits, which differs from a charitable deduction on
          your federal return. Your specific outcome depends on your tax situation.
        </p>
      </section>

      <section>
        <h2>3. Annual limits and program types</h2>
        <p className="mt-3 text-muted-foreground">
          Arizona law establishes separate credit programs (for example, individual credits for original and
          switcher/overflow categories and credits for corporate contributions where applicable). Maximum
          credit amounts, carryforward rules, and deadlines change with legislation.{" "}
          <strong>
            Always verify current limits, deadlines, and definitions with official ADOR guidance and a
            qualified tax professional
          </strong>{" "}
          before relying on any figures shown on our website or materials.
        </p>
      </section>

      <section>
        <h2>4. Recommendations and designation</h2>
        <p className="mt-3 text-muted-foreground">
          Donors may be able to recommend a student or school for scholarship consideration, subject to STO
          policies and Arizona law. Recommendations are not guaranteed awards and must be administered in
          compliance with statutory requirements. ACT retains discretion and obligations consistent with its
          certification and governing law.
        </p>
      </section>

      <section>
        <h2>5. Receipts and documentation</h2>
        <p className="mt-3 text-muted-foreground">
          ACT will provide acknowledgment or receipt documentation for qualifying donations in accordance
          with our procedures and applicable law. Retain your records for your tax preparer and any ADOR
          inquiries.
        </p>
      </section>

      <section>
        <h2>6. Federal income tax</h2>
        <p className="mt-3 text-muted-foreground">
          The federal income tax treatment of donations to an STO may differ from the Arizona credit. The
          IRS and your advisor can help you understand whether any portion is deductible for federal
          purposes and how the Arizona credit interacts with your overall return.
        </p>
      </section>

      <section>
        <h2>7. Changes in law</h2>
        <p className="mt-3 text-muted-foreground">
          Tax laws and STO rules may change. ACT may update site content to reflect general developments,
          but <strong>we do not warrant that any summary is complete or current</strong>. Official sources
          and professional advice control.
        </p>
      </section>

      <section>
        <h2>8. Organization information</h2>
        <p className="mt-3 text-muted-foreground">
          Arizona Christian Tuition operates as a nonprofit organization in support of private school
          tuition assistance in Arizona. Publicly available organizational details (including EIN and
          certification status) are posted or provided upon request as required by law. Our site footer may
          display a placeholder EIN until final publication — confirm the correct EIN on official filings
          and receipts.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p className="mt-3 text-muted-foreground">
          For questions about donations, receipts, or program administration, use our{" "}
          <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
            Contact
          </Link>{" "}
          page. For tax questions, consult the Arizona Department of Revenue and a licensed CPA or tax
          attorney.
        </p>
      </section>
    </LegalPageShell>
  );
}
