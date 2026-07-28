/**
 * Automation trigger events + condition options + merge-field substitution.
 * Client-safe (no server-only / no Prisma) so the UI can list events and preview
 * merged content, and the cron can render on the server.
 */

export type AutomationEventDef = {
  id: string;
  label: string;
  description: string;
  /** Merge tokens the event payload provides (without braces). */
  fields: string[];
};

export const AUTOMATION_EVENTS: AutomationEventDef[] = [
  {
    id: "donation_paid",
    label: "Donation paid",
    description: "Fires when a donation is captured/marked paid.",
    fields: ["first_name", "last_name", "full_name", "email", "phone", "donation_amount", "campaign_title", "campaign_url", "tax_year", "receipt_number", "site_url"],
  },
  {
    id: "tax_receipt_generated",
    label: "Tax receipt generated",
    description: "Fires when a tax receipt is created for a paid donation.",
    fields: ["first_name", "full_name", "email", "donation_amount", "receipt_number", "tax_year", "campaign_title", "site_url"],
  },
  {
    id: "user_registered",
    label: "User registered",
    description: "Fires when a new user account is created.",
    fields: ["first_name", "last_name", "full_name", "email", "role", "site_url"],
  },
  {
    id: "role_added",
    label: "Role added",
    description: "Fires when a role is added to a user.",
    fields: ["first_name", "full_name", "email", "role", "site_url"],
  },
  {
    id: "campaign_submitted",
    label: "Campaign submitted",
    description: "Fires when a campaign is submitted for review.",
    fields: ["first_name", "full_name", "email", "campaign_title", "campaign_url", "site_url"],
  },
  {
    id: "campaign_approved",
    label: "Campaign approved",
    description: "Fires when a campaign is approved.",
    fields: ["first_name", "full_name", "email", "campaign_title", "campaign_url", "site_url"],
  },
];

export function automationEventDef(id: string): AutomationEventDef | undefined {
  return AUTOMATION_EVENTS.find((e) => e.id === id);
}

/** Roles usable in automation conditions (audience). */
export const AUTOMATION_CONDITION_ROLES: { id: string; label: string }[] = [
  { id: "parent", label: "Parent / Guardian" },
  { id: "student", label: "Student" },
  { id: "donor_individual", label: "Individual Donor" },
  { id: "donor_business", label: "Business Donor" },
];

export type AutomationConditions = {
  roles?: string[];
  minAmount?: number;
  campaignId?: string;
};

export type AutomationPayload = Record<string, string | number | null | undefined>;

/** Replace {{token}} occurrences with payload values (missing → empty string). */
export function applyMergeFields(text: string, payload: AutomationPayload): string {
  if (!text) return text;
  return text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, key: string) => {
    const v = payload[key.toLowerCase()];
    return v == null ? "" : String(v);
  });
}
