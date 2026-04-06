export type UserRole =
  | "super_admin"
  | "parent"
  | "student"
  | "donor_individual"
  | "donor_business";

/** Roles that use the shared portal dashboard shell (excludes super_admin). */
export const PORTAL_ROLES = [
  "parent",
  "student",
  "donor_individual",
  "donor_business",
] as const;

export type PortalRole = (typeof PORTAL_ROLES)[number];

export function isPortalRole(r: UserRole): r is PortalRole {
  return r !== "super_admin";
}

export type ActSession = {
  email: string;
  role: UserRole;
  name: string;
  /** Portal types this login may use; super_admin sessions use []. */
  roles: PortalRole[];
};

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  parent: "Parent / Guardian",
  student: "Student",
  donor_individual: "Individual Donor",
  donor_business: "Business Donor",
};

/** Short labels for the dashboard portal switcher tabs. */
export const PORTAL_SWITCHER_LABEL: Record<PortalRole, string> = {
  parent: "Parent",
  student: "Student",
  donor_individual: "Individual Donor",
  donor_business: "Business Donor",
};

/** Stable tab order; filter by assigned roles for each user. */
export const PORTAL_SWITCHER_ORDER: PortalRole[] = [
  "parent",
  "student",
  "donor_business",
  "donor_individual",
];
