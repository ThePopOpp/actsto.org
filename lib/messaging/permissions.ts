/**
 * Internal direct-messaging permission rules. Framework-agnostic (no server-only
 * / no Prisma) so it can run on the client (to filter recipient pickers) and the
 * server (to authorize sends). The API layer is the source of truth — it also
 * enforces the age gate with real data.
 */

export type MessagingRole = "admin" | "parent" | "student" | "donor";

/** Collapse the app's granular role strings into a messaging role. */
export function toMessagingRole(role: string | null | undefined): MessagingRole | null {
  switch (role) {
    case "super_admin":
      return "admin";
    case "parent":
    case "guardian":
    case "parent_guardian":
      return "parent";
    case "student":
      return "student";
    case "individual_donor":
    case "donor_individual":
    case "business_donor":
    case "donor_business":
    case "donor":
      return "donor";
    default:
      return null;
  }
}

/** Pick the highest-priority messaging role from a user's active roles. */
export function primaryMessagingRole(roles: (string | null | undefined)[]): MessagingRole | null {
  const order: MessagingRole[] = ["admin", "parent", "donor", "student"];
  const mapped = roles.map(toMessagingRole).filter((r): r is MessagingRole => Boolean(r));
  return order.find((r) => mapped.includes(r)) ?? null;
}

/** Allowed role pairs (order-independent). Admin ↔ anyone is handled separately. */
const ALLOWED_PAIRS: [MessagingRole, MessagingRole][] = [
  ["parent", "student"],
  ["parent", "donor"],
  ["student", "donor"],
];

/** Whether the donor↔student channel is involved (the one needing an age gate). */
export function pairNeedsAgeGate(a: MessagingRole, b: MessagingRole): boolean {
  return (a === "donor" && b === "student") || (a === "student" && b === "donor");
}

/**
 * Role-level check. Returns false for same-role pairs (except admin, who can
 * message everyone). Donor↔student is allowed here at the role level; the API
 * additionally verifies the student is 16+ before creating the conversation.
 */
export function canRolesMessage(a: MessagingRole | null, b: MessagingRole | null): boolean {
  if (!a || !b) return false;
  if (a === "admin" || b === "admin") return true;
  if (a === b) return false;
  return ALLOWED_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** The set of messaging roles a given role is allowed to contact (excludes admin-only targets). */
export function messageableRoles(role: MessagingRole | null): MessagingRole[] {
  if (!role) return [];
  if (role === "admin") return ["admin", "parent", "student", "donor"];
  const all: MessagingRole[] = ["parent", "student", "donor"];
  return all.filter((other) => canRolesMessage(role, other));
}

/** Is a student old enough to participate in donor↔student messaging? */
export function studentMeetsAgeGate(input: {
  ageVerified?: boolean | null;
  birthDate?: Date | string | null;
  hasLoginAccount?: boolean | null;
}): boolean {
  // Only 16+ students get a self-managed login account, so a login already implies 16+.
  if (input.hasLoginAccount) return true;
  if (input.ageVerified) return true;
  if (input.birthDate) {
    const dob = typeof input.birthDate === "string" ? new Date(input.birthDate) : input.birthDate;
    if (!Number.isNaN(dob.getTime())) {
      const sixteenYearsMs = 16 * 365.25 * 24 * 60 * 60 * 1000;
      return Date.now() - dob.getTime() >= sixteenYearsMs;
    }
  }
  return false;
}
