import type { UserRole } from "@/lib/auth/types";
import { ROLE_LABEL } from "@/lib/auth/types";
import { ADMIN_SAMPLE_USERS } from "@/lib/admin/mock-users";
import { MOCK_CAMPAIGNS } from "@/lib/campaigns";

export type InboxChannel = "email" | "sms";

export type InboundMessage = {
  id: string;
  fromName: string;
  fromEmail: string;
  fromPhone?: string;
  subject: string;
  preview: string;
  body: string;
  channel: InboxChannel;
  receivedAt: string;
  unread: boolean;
  flagged: boolean;
  senderRole?: UserRole;
  campaignSlug?: string;
  campaignTitle?: string;
};

export const MOCK_INBOUND_MESSAGES: InboundMessage[] = [
  {
    id: "m-1",
    fromName: "Jeremy Waters",
    fromEmail: "jwaters@example.com",
    subject: "Question about overflow vs original credit",
    preview:
      "Hi ACT team — we’re almost at our family goal. Can you confirm whether our donors should split between…",
    body:
      "Hi ACT team — we’re almost at our family goal. Can you confirm whether our donors should split between original and overflow in one checkout, or is it better to run two separate gifts? We want to make it easy for grandparents giving smaller amounts.\n\nThanks,\nJeremy",
    channel: "email",
    receivedAt: "2026-03-30T14:22:00",
    unread: true,
    flagged: false,
    senderRole: "parent",
    campaignSlug: "waters-family-fundraiser",
    campaignTitle: "Waters Family Fundraiser",
  },
  {
    id: "m-2",
    fromName: "James Okonkwo",
    fromEmail: "j.okonkwo@donors.org",
    subject: "Corporate match documentation",
    preview:
      "Please send last quarter’s consolidated receipt for our finance team. We need vendor name exactly as…",
    body:
      "Please send last quarter’s consolidated receipt for our finance team. We need vendor name exactly as registered with ADOR for our internal audit.\n\nBest,\nJames Okonkwo\nGrants & Community Relations",
    channel: "email",
    receivedAt: "2026-03-30T11:05:00",
    unread: true,
    flagged: true,
    senderRole: "donor_business",
  },
  {
    id: "m-3",
    fromName: "Rachel Thompson",
    fromEmail: "rachel.t@faithfulgiving.com",
    subject: "Re: Thank you note timing",
    preview:
      "That works for us — happy to receive the impact summary in May after semester ends…",
    body:
      "That works for us — happy to receive the impact summary in May after semester ends. Will the note mention our designation explicitly?\n\nRachel",
    channel: "email",
    receivedAt: "2026-03-29T16:40:00",
    unread: false,
    flagged: false,
    senderRole: "donor_individual",
    campaignSlug: "leavitt-family-fundraiser",
    campaignTitle: "Leavitt Family Fundraiser",
  },
  {
    id: "m-4",
    fromName: "Marcus Chen",
    fromEmail: "mchen.student@gmail.com",
    fromPhone: "+1 602-555-0198",
    subject: "SMS · Campaign page photo",
    preview: "Can i swap my campaign photo from my phone? link sends me to login only",
    body:
      "Can i swap my campaign photo from my phone? link sends me to login only - thx",
    channel: "sms",
    receivedAt: "2026-03-29T09:15:00",
    unread: true,
    flagged: false,
    senderRole: "student",
    campaignSlug: "waters-family-fundraiser",
    campaignTitle: "Waters Family Fundraiser",
  },
  {
    id: "m-5",
    fromName: "Sarah Mitchell",
    fromEmail: "sarah.mitchell@example.com",
    subject: "School admin copied on donations",
    preview:
      "Valley Christian asked if we can cc their business office on large pledges — is that something you support…",
    body:
      "Valley Christian asked if we can cc their business office on large pledges — is that something you support through the dashboard, or should families forward manually?\n\nSarah",
    channel: "email",
    receivedAt: "2026-03-28T13:50:00",
    unread: false,
    flagged: false,
    senderRole: "parent",
  },
];

export type BroadcastSegment = {
  id: string;
  label: string;
  description: string;
  /** Shown as “~n recipients (demo)” */
  estimatedRecipients: number;
  /** Optional campaign context for staff clarity */
  campaignSlug?: string;
  rolesHint: string;
};

export const EMAIL_BROADCAST_SEGMENTS: BroadcastSegment[] = [
  {
    id: "seg-parents-active",
    label: "Parents with an active campaign",
    description: "Family leads who currently have a published or pending campaign.",
    estimatedRecipients: 128,
    rolesHint: "Primarily parent accounts",
  },
  {
    id: "seg-donors-individual",
    label: "Individual donors (last 24 mo.)",
    description: "Supporters who gave as individuals; useful for tax-season nudges.",
    estimatedRecipients: 412,
    rolesHint: "donor_individual",
  },
  {
    id: "seg-donors-business",
    label: "Business & corporate contacts",
    description: "Corporate giving leads and billing contacts.",
    estimatedRecipients: 56,
    rolesHint: "donor_business",
  },
  {
    id: "seg-students-16",
    label: "Students (16+ with login)",
    description: "Student portal accounts — use for education and compliance only.",
    estimatedRecipients: 89,
    rolesHint: "student",
  },
  ...MOCK_CAMPAIGNS.map((c) => ({
    id: `seg-campaign-${c.slug}`,
    label: `Everyone tied to: ${c.title}`,
    description: `Campaign lead (${c.parent.name}), linked donors, and notification prefs scoped to this slug.`,
    estimatedRecipients: Math.max(12, c.donorCount + 3),
    campaignSlug: c.slug,
    rolesHint: "Parents, donors, optional school CC",
  })),
];

export type ComposeRecipientOption = {
  value: string;
  label: string;
  sublabel: string;
};

/** Merge sample CRM users with campaign family leads for the “individual” picker. */
export function getComposeRecipientOptions(): ComposeRecipientOption[] {
  const byEmail = new Map<string, ComposeRecipientOption>();
  for (const u of ADMIN_SAMPLE_USERS) {
    const key = u.email.toLowerCase();
    byEmail.set(key, {
      value: u.email,
      label: u.name,
      sublabel: `${ROLE_LABEL[u.role]} · ${u.email}`,
    });
  }
  for (const c of MOCK_CAMPAIGNS) {
    const key = c.parent.email.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, {
        value: c.parent.email,
        label: c.parent.name,
        sublabel: `Campaign lead · ${c.title}`,
      });
    }
  }
  return [...byEmail.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export const COMPOSE_TEMPLATES: { id: string; label: string; subject: string; body: string }[] = [
  {
    id: "tax-season",
    label: "Tax season · credit reminder",
    subject: "Your Arizona tuition tax credit window (friendly reminder)",
    body:
      "Hi {{first_name}},\n\nThank you again for standing with Arizona families through Arizona Christian Tuition. As tax season approaches, remember you can direct eligible Arizona tax credits toward scholarships — many supporters give before April 15 to apply to the prior or current tax year per your advisor’s guidance.\n\nIf you’d like to give again or explore a new campaign, reply to this email or visit our site.\n\nBlessings,\nACT Team",
  },
  {
    id: "campaign-tip",
    label: "Campaign best practice",
    subject: "Quick tip: sharing your campaign story",
    body:
      "Hi {{first_name}},\n\nWe’re cheering you on with your campaign. Families who share a short video or a specific tuition “gap” number in the first paragraph often see stronger engagement from church and relatives.\n\nNeed help with wording? Just reply.\n\n— ACT Support",
  },
  {
    id: "receipt-followup",
    label: "Receipt / documentation",
    subject: "Your giving documentation from ACT",
    body:
      "Hi {{first_name}},\n\nAttached (or linked in production) is the documentation for your recent support. Please retain for your tax preparer; we are not able to provide individualized tax advice.\n\nQuestions about designation or timing? Reply here.\n\nThank you,\nACT",
  },
];
