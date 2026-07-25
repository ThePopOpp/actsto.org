export const EMAIL_CONSENT_DISCLOSURE_VERSION = "ACTSTO_EMAIL_DISCLOSURE_V1_2026_07";

export const EMAIL_CONSENT_COPY =
  "By subscribing you agree to receive emails from Arizona Christian Tuition (ACTSTO.ORG) — campaign updates, " +
  "donation and tax-receipt notices, event invitations, and program news. You can unsubscribe anytime via the link " +
  "in any email or the Communication Preferences center. Consent is not required to donate, apply for a scholarship, " +
  "create an account, or use ACTSTO services.";

export type ConsentCategory = "marketing" | "campaignUpdates" | "donationUpdates";

export const CONSENT_CATEGORIES: { key: ConsentCategory; label: string; help: string }[] = [
  { key: "campaignUpdates", label: "Campaign updates", help: "Progress, milestones, and deadlines for campaigns you follow or run." },
  { key: "donationUpdates", label: "Donation & receipt updates", help: "Confirmations, tax receipts, and giving reminders." },
  { key: "marketing", label: "News & newsletters", help: "Occasional ACTSTO news, stories, and event invitations." },
];
