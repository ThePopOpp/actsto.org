import { existsSync } from "node:fs";
import path from "node:path";

import type { Metadata } from "next";
import Link from "next/link";

import { getEligibilitySettings } from "@/lib/eligibility/settings-server";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Displaced Student Verification Form",
  description: "The form families sign so Arizona Christian Tuition can confirm a student's foster care placement with DCS.",
};

export const dynamic = "force-dynamic";

/** Where the signed-off PDF goes. Replace this one file to publish a new version. */
const PDF_PUBLIC_PATH = "/forms/ACTSTO-Displaced-Student-Verification-Form.pdf";

/**
 * The stable address the application and the student profile link to. The
 * PDF itself is a document compliance and DCS sign off on, so it's published
 * by placing the file in public/forms; until then families are told how to
 * ask for it rather than shown a broken link.
 */
export default async function DisplacedFormPage() {
  const settings = await getEligibilitySettings();
  const available = existsSync(path.join(process.cwd(), "public", PDF_PUBLIC_PATH));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
      <h1 className="font-heading text-3xl font-semibold text-primary">Displaced Student Verification Form</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{settings.displacedDefinition}</p>

      <ol className="mt-8 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-foreground">
        <li>Download the form and fill in Part 1 (student) and Part 2 (parent or guardian, with your signature).</li>
        <li>
          Upload the signed form on your student&apos;s page in your parent dashboard, or on the scholarship application.
          Upload the form only. Please don&apos;t send court documents, case files or emails with caseworkers.
        </li>
        <li>
          We send the form to the Arizona Department of Child Safety (DCS), which confirms the placement history.
          Displaced status is verified once and lasts through 12th grade.
        </li>
      </ol>

      <div className="mt-8 rounded-lg border border-border/80 bg-muted/30 p-5">
        {available ? (
          <a
            href={PDF_PUBLIC_PATH}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Download the form (PDF)
          </a>
        ) : (
          <p className="text-sm text-foreground">
            Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Displaced%20Student%20Verification%20Form`} className="text-primary underline-offset-4 hover:underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            or call {SUPPORT_PHONE_DISPLAY} and we&apos;ll send you the form.
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          The form asks for your child&apos;s Social Security number so DCS can find their records. It is stored
          privately, opened only by our review team (every open is logged), and kept four years after the last fiscal
          year in which we pay a scholarship for your student, then securely deleted.
        </p>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/dashboard/parent/students" className="text-primary underline-offset-4 hover:underline">
          Go to your students
        </Link>
      </p>
    </div>
  );
}
