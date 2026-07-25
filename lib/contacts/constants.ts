/** Contact CRM constants + helpers. Client-safe (no server-only / no Prisma). */

export type ContactStage = "new" | "contacted" | "engaged" | "donor" | "inactive";

export const CONTACT_STAGES: { id: ContactStage; label: string; color: string }[] = [
  { id: "new", label: "New", color: "#64748b" },
  { id: "contacted", label: "Contacted", color: "#0ea5e9" },
  { id: "engaged", label: "Engaged", color: "#8b5cf6" },
  { id: "donor", label: "Donor", color: "#16a34a" },
  { id: "inactive", label: "Inactive", color: "#9ca3af" },
];

export const CONTACT_TYPES: { id: string; label: string }[] = [
  { id: "parent", label: "Parent / Guardian" },
  { id: "student", label: "Student" },
  { id: "donor", label: "Individual Donor" },
  { id: "business", label: "Business Donor" },
  { id: "school", label: "School" },
  { id: "vendor", label: "Vendor / Partner" },
  { id: "other", label: "Other" },
];

export function stageLabel(id: string | null | undefined): string {
  return CONTACT_STAGES.find((s) => s.id === id)?.label ?? "New";
}
export function stageColor(id: string | null | undefined): string {
  return CONTACT_STAGES.find((s) => s.id === id)?.color ?? "#64748b";
}
export function typeLabel(id: string | null | undefined): string | null {
  return CONTACT_TYPES.find((t) => t.id === id)?.label ?? (id || null);
}

export type ContactDTO = {
  id: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  contactType: string | null;
  stage: string;
  status: string;
  tags: string[];
  source: string | null;
  notes: string | null;
  avatarUrl: string | null;
  logoUrl: string | null;
  city: string | null;
  state: string | null;
  roles?: string[];
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function contactName(c: Pick<ContactDTO, "displayName" | "firstName" | "lastName" | "email">): string {
  return (
    c.displayName?.trim() ||
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    c.email ||
    "Unnamed contact"
  );
}
