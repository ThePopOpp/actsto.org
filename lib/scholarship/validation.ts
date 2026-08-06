/**
 * Application validation.
 *
 * Client-safe on purpose: the wizard runs these rules for inline errors, and
 * the submit route runs the *same* function as the actual gate. One ruleset, so
 * the two can't drift and tell a parent different things.
 *
 * Client validation is a courtesy. Every submission is treated as untrusted.
 */

import {
  countWords,
  NARRATIVE_MIN_WORDS,
  OVERFLOW_SLUGS,
  overflowBySlug,
  overflowNeedsDocs,
  type ApplicationStepId,
} from "@/lib/scholarship/constants";

export type ValidationIssue = {
  section: ApplicationStepId;
  field: string;
  message: string;
};

export type ValidatableApplication = {
  studentId: string | null;
  schoolYear: string | null;
  schoolId: string | null;
  schoolNameOther: string | null;
  grade: string | null;
  tuitionAfterDiscounts: number | null;
  narrative: string | null;
  incomeConfirmedAt: Date | null;
  overflowQualification: string;
  overflowOrg: string | null;
  esaCurrentYear: string | null;
  esaPriorYear: string | null;
  documents?: { id: string; purgedAt: Date | null }[];
};

export function validateApplication(
  application: ValidatableApplication,
  householdCount: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Step 1 — family
  if (!application.studentId) {
    issues.push({ section: "family", field: "studentId", message: "Choose a student." });
  }
  if (!application.schoolYear) {
    issues.push({ section: "family", field: "schoolYear", message: "Choose a school year." });
  }
  if (!application.grade) {
    issues.push({ section: "family", field: "grade", message: "No grade selected." });
  }
  // Either a listed school, or a name typed under "Other" — one of the two.
  if (!application.schoolId && !application.schoolNameOther?.trim()) {
    issues.push({
      section: "family",
      field: "schoolId",
      message: "Choose a school, or pick “Other” and type its name.",
    });
  }
  const tuition = application.tuitionAfterDiscounts;
  if (tuition === null || !Number.isFinite(tuition) || tuition < 0) {
    issues.push({
      section: "family",
      field: "tuitionAfterDiscounts",
      message: "Enter the tuition your family still owes for the year.",
    });
  }

  // Step 2 — narrative. Warn above the guidance range, never block.
  const words = countWords(application.narrative ?? "");
  if (words < NARRATIVE_MIN_WORDS) {
    issues.push({
      section: "narrative",
      field: "narrative",
      message: `Tell us a little more — at least ${NARRATIVE_MIN_WORDS} words.`,
    });
  }

  // Step 3 — financial. Zero income is a valid answer; an empty roster is not.
  if (householdCount === 0) {
    issues.push({
      section: "financial",
      field: "household",
      message:
        "Add everyone in your household. Someone with no income still needs a row; an empty list doesn't work.",
    });
  }
  if (!application.incomeConfirmedAt) {
    issues.push({
      section: "financial",
      field: "incomeConfirmed",
      message: `Confirm your household income is accurate for the ${application.schoolYear ?? "coming"} school year.`,
    });
  }

  // Step 4 — overflow. An *answer* is required; a qualification is not.
  if (
    !application.overflowQualification ||
    !OVERFLOW_SLUGS.includes(application.overflowQualification)
  ) {
    issues.push({
      section: "overflow",
      field: "overflowQualification",
      message: "Pick the option that fits, or “None of these apply to my student”.",
    });
  }
  if (application.overflowQualification === "prior-award" && !application.overflowOrg) {
    issues.push({
      section: "overflow",
      field: "overflowOrg",
      message: "Tell us which organization awarded it.",
    });
  }

  // Step 5 — ESA. Both required.
  if (!application.esaCurrentYear) {
    issues.push({ section: "esa", field: "esaCurrentYear", message: "Pick an answer to continue." });
  }
  if (!application.esaPriorYear) {
    issues.push({ section: "esa", field: "esaPriorYear", message: "Pick an answer to continue." });
  }

  return issues;
}

/**
 * Missing documentation warns rather than blocks.
 *
 * The copy tells families they can send proof afterwards, and blocking a family
 * whose IEP is in the post would contradict it. Staff see the gap on the queue.
 */
export function documentWarnings(application: ValidatableApplication): string[] {
  const warnings: string[] = [];
  const liveDocs = (application.documents ?? []).filter((d) => !d.purgedAt).length;
  if (overflowNeedsDocs(application.overflowQualification) && liveDocs === 0) {
    const label = overflowBySlug(application.overflowQualification)?.title ?? "this qualification";
    warnings.push(
      `You haven't attached documentation for “${label}”. You can still submit, but we can't count the Overflow qualification until proof is on file.`,
    );
  }
  return warnings;
}
