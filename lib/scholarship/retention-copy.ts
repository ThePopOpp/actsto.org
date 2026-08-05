/**
 * What we tell families at the point of upload.
 *
 * Client-safe so the wizard can render it without pulling in the server-only
 * documents module. Keep this in step with `lib/scholarship/documents.ts` and
 * with the retention period published in the privacy policy — if those three
 * ever disagree, the one the family read is the one that counts.
 */
export const RETENTION_NOTICE =
  "These files are stored privately and only our review team can open them. We keep the record that a document was reviewed and what it showed permanently; the file itself is deleted once the audit for that award year is complete. Every time someone opens one, we log who and when.";
