/**
 * Staff capabilities for the scholarship review workflow.
 *
 * Gate on a named capability, never on a role string. Adding a tier later is
 * then one entry in this map rather than an audit of every call site.
 *
 * Client-safe (pure data + a predicate).
 */

export const CAPABILITIES = [
  /** Take an application off the queue so two reviewers don't duplicate work. */
  "review.claim",
  /** Approve, deny, or request more information. */
  "review.decide",
  /** Open an uploaded document. Not everyone who can read an application needs this. */
  "documents.view",
  /** Mark a document as supporting the claimed qualification. */
  "documents.verify",
  /** Unlock a submitted application so the parent can edit again. */
  "application.reopen",
  /** Create and move the open/close dates for a school year. */
  "windows.manage",
  /** Overturn a verified eligibility finding. */
  "eligibility.revoke",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type StaffRole = "admin" | "reviewer" | "read_only" | "finance";

const ROLE_CAPABILITIES: Record<StaffRole, Capability[]> = {
  admin: [
    "review.claim",
    "review.decide",
    "documents.view",
    "documents.verify",
    "application.reopen",
    "windows.manage",
    "eligibility.revoke",
  ],
  // Defined ahead of use so the tiers exist the day ACT wants them. Today only
  // `admin` is assigned; the others grant strictly less.
  reviewer: ["review.claim", "review.decide", "documents.view", "documents.verify"],
  read_only: [],
  finance: [],
};

export function can(role: StaffRole | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

export function capabilitiesFor(role: StaffRole | null | undefined): Capability[] {
  if (!role) return [];
  return ROLE_CAPABILITIES[role] ?? [];
}
