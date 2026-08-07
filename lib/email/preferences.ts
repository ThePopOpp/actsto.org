import "server-only";

import { prisma } from "@/lib/prisma";
import { getCatalogEntry, type EmailPreferenceKey } from "@/lib/email/catalog";
import {
  DEFAULT_EMAIL_PREFERENCES,
  decideCatalogSend,
  type PreferenceRecord,
  type SendDecision,
} from "@/lib/email/preference-rules";

/**
 * Database-backed side of the preference gate.
 *
 * The decision itself lives in `preference-rules.ts` so it stays pure and
 * testable; this file only fetches the row to feed it. Nothing should call
 * `sendEmail` for a catalogue event without going through one of these.
 */

export {
  DEFAULT_EMAIL_PREFERENCES,
  decideCatalogSend,
  type PreferenceRecord,
  type SendDecision,
};

export async function getEmailPreferences(userId: string): Promise<PreferenceRecord> {
  const row = await prisma.communicationPreference
    .findUnique({ where: { userId } })
    .catch(() => null);
  if (!row) return DEFAULT_EMAIL_PREFERENCES;
  return {
    emailOptIn: row.emailOptIn,
    transactionalEmailEnabled: row.transactionalEmailEnabled,
    marketingEmailEnabled: row.marketingEmailEnabled,
    donationUpdatesEnabled: row.donationUpdatesEnabled,
    campaignUpdatesEnabled: row.campaignUpdatesEnabled,
    campaignAlertsEnabled: row.campaignAlertsEnabled,
    featuredCampaignsEnabled: row.featuredCampaignsEnabled,
    productUpdatesEnabled: row.productUpdatesEnabled,
    scholarshipUpdatesEnabled: row.scholarshipUpdatesEnabled,
  };
}

/** Decide for one user. */
export async function canSendCatalogEmail(
  catalogKey: string,
  userId: string | null,
): Promise<SendDecision> {
  const entry = getCatalogEntry(catalogKey);
  if (!entry) return { allowed: false, reason: "unknown-event" };
  if (entry.preference === null) return { allowed: true, reason: "required" };
  // No profile means no stored preference — fall back to the defaults rather
  // than blocking, so a pre-account donor still gets their thank-you.
  if (!userId) return decideCatalogSend(catalogKey, null);
  return decideCatalogSend(catalogKey, await getEmailPreferences(userId));
}

/**
 * Filter a recipient list for a bulk send.
 *
 * One query for the whole list rather than one per recipient — a weekly digest
 * to a few thousand donors should not be a few thousand round trips.
 */
export async function filterRecipientsByPreference<T extends { userId: string }>(
  catalogKey: string,
  recipients: T[],
): Promise<T[]> {
  const entry = getCatalogEntry(catalogKey);
  if (!entry) return [];
  if (entry.preference === null) return recipients;
  if (recipients.length === 0) return [];

  const rows = await prisma.communicationPreference
    .findMany({ where: { userId: { in: recipients.map((r) => r.userId) } } })
    .catch(() => []);
  const byUser = new Map(rows.map((row) => [row.userId, row]));
  const key = entry.preference as EmailPreferenceKey;

  return recipients.filter((recipient) => {
    const row = byUser.get(recipient.userId);
    // An absent row means the user has never touched their settings, so the
    // defaults apply — which is what they'd see if they opened the page.
    if (!row) return DEFAULT_EMAIL_PREFERENCES[key];
    if (!row.emailOptIn) return false;
    return row[key];
  });
}
