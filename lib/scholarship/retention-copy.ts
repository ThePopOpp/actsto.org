/**
 * What we tell families at the point of upload, and the date rule behind it.
 *
 * Client-safe so the wizard can render it without pulling in the server-only
 * documents module. Keep this in step with `lib/scholarship/documents.ts` and
 * with the retention period published in the privacy policy — if those three
 * ever disagree, the one the family read is the one that counts.
 */
export const RETENTION_NOTICE =
  "These files are stored privately and only our review team can open them. We keep each file for at least four years after the state's annual report for that award year is due (September 30 after the school year ends), as Arizona Department of Revenue rules require, then securely delete it. The record that a document was reviewed and what it showed is kept permanently. Every time someone opens a file, we log who and when.";

/** Displaced-student verification forms are kept on a different clock. */
export const DISPLACED_RETENTION_NOTICE =
  "The signed verification form is kept privately for four years after the last fiscal year in which we pay a scholarship for this student, then securely deleted. Only our review team can open it, and every open is logged.";

/**
 * Four years (or `years`) after the September 30 annual-report due date that
 * follows the award year. "2026/2027" → September 30, 2031.
 */
export function retainUntilForSchoolYear(
  schoolYear: string | null | undefined,
  now: Date = new Date(),
  years = 4,
): Date {
  const parsed = Number((schoolYear ?? "").split("/")[0]);
  const startYear = Number.isInteger(parsed) && parsed > 2000 ? parsed : now.getFullYear();
  // The award year ends June 30 of startYear + 1; its report is due that Sept 30.
  return new Date(Date.UTC(startYear + 1 + years, 8, 30));
}
