import "server-only";

import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { can, type Capability, type StaffRole } from "@/lib/scholarship/capabilities";
import { isStepId, type ApplicationStepId } from "@/lib/scholarship/constants";

/**
 * Tenancy for the scholarship application portal.
 *
 * Why this file exists: application data is read through Prisma on a privileged
 * connection, so Postgres RLS never sees these queries. The RLS policies in the
 * migration are defence in depth for anything arriving via the Supabase client;
 * **this module is the actual enforcement.** Every read and write of an
 * application, a household member or a document goes through here. No route or
 * component composes its own filter.
 */

export type ParentActor = {
  profileId: string;
  email: string;
  name: string;
};

export type StaffActor = {
  profileId: string | null;
  email: string;
  name: string;
  staffRole: StaffRole;
  isSuperAdmin: boolean;
};

export class ScopeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ScopeError";
  }
}

// ── Actors ───────────────────────────────────────────────────────────────────

/**
 * The signed-in parent, resolved to a `profiles` row. Returns null when the
 * request is unauthenticated or the session has no parent profile — callers
 * decide between a redirect (pages) and a 401 (routes).
 */
export async function getParentActor(): Promise<ParentActor | null> {
  const session = await getActSession();
  if (!session?.email) return null;

  const profile = await prisma.profile.findFirst({
    where: { email: { equals: session.email, mode: "insensitive" } },
    select: { id: true, email: true, displayName: true, fullName: true },
  });
  if (!profile) return null;

  return {
    profileId: profile.id,
    email: profile.email,
    name: (profile.displayName ?? profile.fullName ?? session.name ?? "").trim(),
  };
}

export async function requireParentActor(): Promise<ParentActor> {
  const actor = await getParentActor();
  if (!actor) throw new ScopeError("Not signed in.", 401);
  return actor;
}

/**
 * Staff actor with a resolved capability tier. Super Admins are treated as
 * `admin` — the allowlist is the existing source of truth for that.
 */
export async function getStaffActor(): Promise<StaffActor | null> {
  const session = await getActSession();
  if (!session?.email) return null;

  const profile = await prisma.profile.findFirst({
    where: { email: { equals: session.email, mode: "insensitive" } },
    select: { id: true, staffRole: true, isSuperAdmin: true, displayName: true, fullName: true },
  });

  const isSuperAdmin = session.role === "super_admin" || profile?.isSuperAdmin === true;
  const staffRole = (profile?.staffRole as StaffRole | null) ?? (isSuperAdmin ? "admin" : null);
  if (!staffRole) return null;

  return {
    profileId: profile?.id ?? null,
    email: session.email,
    name: (profile?.displayName ?? profile?.fullName ?? session.name ?? "").trim(),
    staffRole,
    isSuperAdmin,
  };
}

export async function requireCapability(capability: Capability): Promise<StaffActor> {
  const actor = await getStaffActor();
  if (!actor) throw new ScopeError("Not signed in.", 401);
  if (!can(actor.staffRole, capability)) {
    throw new ScopeError("You do not have access to this.", 403);
  }
  return actor;
}

// ── Scoped `where` clauses ───────────────────────────────────────────────────

/**
 * Applications this parent owns. Ownership is the guardian who created the
 * application, plus any guardian linked to the student — a second parent on the
 * account should not be locked out of their own child's application.
 */
export function parentApplicationWhere(profileId: string) {
  return {
    OR: [
      { guardianUserId: profileId },
      { student: { parentUserId: profileId } },
      { student: { guardians: { some: { guardianUserId: profileId } } } },
    ],
  };
}

/** Students this parent may apply on behalf of. */
export function parentStudentWhere(profileId: string) {
  return {
    OR: [
      { parentUserId: profileId },
      { guardians: { some: { guardianUserId: profileId } } },
    ],
  };
}

// ── Scoped fetches ───────────────────────────────────────────────────────────

const APPLICATION_INCLUDE = {
  student: {
    select: { id: true, firstName: true, lastName: true, grade: true, schoolId: true },
  },
  school: { select: { id: true, name: true } },
  window: true,
  documents: {
    where: { purgedAt: null },
    orderBy: { uploadedAt: "asc" },
  },
} as const;

export type ScopedApplication = NonNullable<
  Awaited<ReturnType<typeof getOwnedApplication>>
>;

/** One application, only if this parent owns it. Null otherwise — never throw
 *  a "not found" that differs from a "not yours", which leaks existence. */
export async function getOwnedApplication(applicationId: string, profileId: string) {
  return prisma.scholarshipApplication.findFirst({
    where: { id: applicationId, ...parentApplicationWhere(profileId) },
    include: APPLICATION_INCLUDE,
  });
}

export async function requireOwnedApplication(applicationId: string, profileId: string) {
  const application = await getOwnedApplication(applicationId, profileId);
  if (!application) throw new ScopeError("Application not found.", 404);
  return application;
}

/** The parent's live application for a school year, if one exists. */
export async function getLiveApplication(profileId: string, schoolYear: string, studentId?: string) {
  return prisma.scholarshipApplication.findFirst({
    where: {
      ...parentApplicationWhere(profileId),
      schoolYear,
      ...(studentId ? { studentId } : {}),
      status: { notIn: ["denied", "withdrawn"] },
    },
    include: APPLICATION_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

/** One document, only if this parent owns the application it belongs to. */
export async function getOwnedDocument(documentId: string, profileId: string) {
  return prisma.applicationDocument.findFirst({
    where: { id: documentId, application: parentApplicationWhere(profileId) },
    include: { application: { select: { id: true, lockedAt: true, status: true } } },
  });
}

// ── Write guards ─────────────────────────────────────────────────────────────

export type WritableState =
  | { writable: true; scope: "all" }
  | { writable: true; scope: "sections"; sections: ApplicationStepId[] }
  | { writable: false; reason: string };

/**
 * Can the parent still write to this application, and to which parts?
 *
 * - A draft is fully writable.
 * - A submitted application is locked. The parent still *sees* everything.
 * - `needs_info` reopens only the sections staff asked about.
 * - A staff `reopen` clears `lockedAt`, which puts it back to fully writable.
 */
export function writableState(application: {
  status: string;
  lockedAt: Date | null;
  fieldsRequested: string[];
  infoNotReceived?: boolean;
}): WritableState {
  if (application.status === "denied") {
    return {
      writable: false,
      reason: "This application was not approved and can no longer be edited.",
    };
  }
  if (application.status === "withdrawn") {
    return { writable: false, reason: "This application was withdrawn." };
  }

  if (application.status === "needs_info") {
    const sections = application.fieldsRequested.filter(isStepId);
    if (sections.length > 0) {
      return { writable: true, scope: "sections", sections };
    }
    // A request with no sections named reopens the whole application rather
    // than locking the parent out of responding at all.
    return { writable: true, scope: "all" };
  }

  // A lapsed deadline sent this back to the queue, but the family can still
  // answer. Missing the window is usually spam filtering or a hard month, and
  // slamming the door on a late reply is the wrong response to either.
  if (application.infoNotReceived) {
    const sections = application.fieldsRequested.filter(isStepId);
    if (sections.length > 0) {
      return { writable: true, scope: "sections", sections };
    }
  }

  if (application.lockedAt) {
    return {
      writable: false,
      reason:
        "Your application is locked while our team reviews it. Contact us if something needs to change.",
    };
  }

  return { writable: true, scope: "all" };
}

export function canWriteSection(state: WritableState, section: ApplicationStepId): boolean {
  if (!state.writable) return false;
  if (state.scope === "all") return true;
  return state.sections.includes(section);
}

/**
 * Throws unless the parent may write `section` on this application. Call this
 * in every mutation path — the read-only UI is a courtesy, this is the rule.
 */
export function assertWritable(
  application: {
    status: string;
    lockedAt: Date | null;
    fieldsRequested: string[];
    infoNotReceived?: boolean;
  },
  section: ApplicationStepId,
): void {
  const state = writableState(application);
  if (!state.writable) throw new ScopeError(state.reason, 409);
  if (!canWriteSection(state, section)) {
    throw new ScopeError(
      "That section is locked. Only the sections our team asked about can be changed.",
      409,
    );
  }
}

// ── Eligibility guard ────────────────────────────────────────────────────────

export class IneligibleError extends Error {
  constructor(
    readonly code: "no_verified_eligibility" | "revoked",
    readonly detail?: string | null,
  ) {
    super(code === "revoked" ? `Eligibility revoked: ${detail ?? "no reason given"}` : code);
    this.name = "IneligibleError";
  }
}

/**
 * The one guard both the awarding process and disbursement call.
 *
 * Two separate moments, sometimes months apart. An ESA contract signed after
 * approval, or documentation that turns out not to support the claim, surfaces
 * in between — and an award made against a finding that has since been revoked
 * must not pay out. One shared function so the two checks can't drift.
 */
export async function assertEligible(studentId: string, schoolYear: string) {
  const row = await prisma.studentYearEligibility.findUnique({
    where: { studentId_schoolYear: { studentId, schoolYear } },
  });
  if (!row) throw new IneligibleError("no_verified_eligibility");
  if (row.revokedAt) throw new IneligibleError("revoked", row.revokedReason);
  return row;
}
