import type { ActSession } from "@/lib/auth/types";

export const PREVIEW_SESSION_PARENT: ActSession = {
  email: "parent.preview@local.dev",
  name: "Jordan Rivera",
  role: "parent",
  roles: ["parent"],
};

export const PREVIEW_SESSION_STUDENT: ActSession = {
  email: "student.preview@local.dev",
  name: "Jace Waters",
  role: "student",
  roles: ["student"],
};

export const PREVIEW_SESSION_DONOR: ActSession = {
  email: "donor.preview@local.dev",
  name: "Rachel Thompson",
  role: "donor_individual",
  roles: ["donor_individual"],
};

export const PREVIEW_SESSION_BUSINESS: ActSession = {
  email: "business.preview@local.dev",
  name: "Faithful Giving Foundation",
  role: "donor_business",
  roles: ["donor_business"],
};
