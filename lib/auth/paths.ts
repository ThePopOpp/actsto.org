import type { UserRole } from "@/lib/auth/types";

export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/dashboard/admin";
    case "parent":
      return "/dashboard/parent";
    case "student":
      return "/dashboard/student";
    case "donor_individual":
      return "/dashboard/donor";
    case "donor_business":
      return "/dashboard/business";
    default:
      return "/dashboard";
  }
}
