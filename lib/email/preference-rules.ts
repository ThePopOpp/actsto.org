/**
 * The rule that decides whether an email may be sent to a person.
 *
 * Pure on purpose. Every other bug in an email system is cosmetic; sending to
 * someone who opted out is a complaint, and in the wrong jurisdiction a fine.
 * Keeping the decision free of Prisma means it can be tested exactly, and the
 * settings page can reuse it to explain itself.
 *
 * The order matters:
 *
 *   1. A required email always sends. Receipts, password resets and approval
 *      decisions are not marketing, and there is no legitimate way to opt out of
 *      the document that proves a tax-credit donation.
 *   2. A global email opt-out stops everything optional.
 *   3. Otherwise the category's own switch decides.
 *
 * It fails *closed* on an unknown catalogue key. A typo should mean "nothing
 * sent" rather than "sent to everyone regardless of preferences" — the quiet
 * failure is recoverable, the loud one is not.
 */

import { getCatalogEntry, type EmailPreferenceKey } from "@/lib/email/catalog";

export type PreferenceRecord = {
  emailOptIn: boolean;
  transactionalEmailEnabled: boolean;
} & Record<EmailPreferenceKey, boolean>;

/** What a user gets before they've ever opened the settings page. */
export const DEFAULT_EMAIL_PREFERENCES: PreferenceRecord = {
  emailOptIn: true,
  transactionalEmailEnabled: true,
  // Broadcast promotion stays opt-in; the rest are the useful, low-volume ones
  // people expect from a service they signed up for.
  marketingEmailEnabled: false,
  donationUpdatesEnabled: true,
  campaignUpdatesEnabled: true,
  campaignAlertsEnabled: true,
  featuredCampaignsEnabled: true,
  productUpdatesEnabled: true,
  scholarshipUpdatesEnabled: true,
};

export type SendDecision = {
  allowed: boolean;
  /** Why, for the log. "Why didn't they get it" is a support ticket. */
  reason: "required" | "allowed" | "unknown-event" | "global-opt-out" | "category-off";
};

export function decideCatalogSend(
  catalogKey: string,
  preferences: PreferenceRecord | null,
): SendDecision {
  const entry = getCatalogEntry(catalogKey);
  if (!entry) return { allowed: false, reason: "unknown-event" };

  // Required mail ignores every switch, including the global one.
  if (entry.preference === null) return { allowed: true, reason: "required" };

  const prefs = preferences ?? DEFAULT_EMAIL_PREFERENCES;
  if (!prefs.emailOptIn) return { allowed: false, reason: "global-opt-out" };

  return prefs[entry.preference]
    ? { allowed: true, reason: "allowed" }
    : { allowed: false, reason: "category-off" };
}
