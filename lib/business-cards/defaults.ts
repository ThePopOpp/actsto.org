// Client-safe defaults for the card builder (no server imports).
import type { BusinessCard, BusinessCardSection, LeadFormSettings, SectionType } from "./types";

export const DEFAULT_COMPANY = "Arizona Christian Tuition";

export const DEFAULT_LEAD_FORM: LeadFormSettings = {
  enabled: true,
  title: "Send me your info",
  description: "Share your details and I'll follow up.",
  button_label: "Send me your info",
  submit_label: "Send info",
  fields: [
    { key: "name", label: "Name", enabled: true, required: true },
    { key: "email", label: "Email", enabled: true, required: true },
    { key: "phone", label: "Phone", enabled: true, required: false },
    { key: "company", label: "Company", enabled: false, required: false },
    { key: "message", label: "Message", enabled: true, required: false },
  ],
};

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `tmp-${Math.random().toString(36).slice(2)}`;
  }
}

export function makeDefaultSections(): BusinessCardSection[] {
  const base: { type: SectionType; label: string; visible: boolean }[] = [
    { type: "opener", label: "Opener / splash", visible: false },
    { type: "profile_header", label: "Profile header", visible: true },
    { type: "quick_actions", label: "Quick actions", visible: true },
    { type: "slideshow", label: "Slideshow", visible: false },
    { type: "links", label: "Links & socials", visible: true },
    { type: "steps", label: "Steps / how it works", visible: false },
    { type: "lead_capture", label: "Lead capture", visible: true },
    { type: "video", label: "Intro video", visible: false },
    { type: "qr_code", label: "QR code", visible: true },
    { type: "nfc", label: "NFC tap to share", visible: false },
  ];
  return base.map((s, i) => ({
    id: uid(),
    sectionType: s.type,
    label: s.label,
    content: {},
    displayOrder: i + 1,
    isVisible: s.visible,
    marginTop: 0,
    marginBottom: 16,
    paddingTop: 0,
    paddingBottom: 0,
  }));
}

export function makeNewCard(owner?: { displayName?: string; email?: string }): BusinessCard {
  const now = new Date().toISOString();
  return {
    id: "",
    ownerEmail: owner?.email ?? "",
    ownerName: owner?.displayName ?? null,
    slug: "",
    cardName: owner?.displayName ? `${owner.displayName}'s Card` : "My Business Card",
    status: "draft",
    isPublic: false,
    displayName: owner?.displayName ?? "",
    firstName: "",
    lastName: "",
    jobTitle: "",
    companyName: DEFAULT_COMPANY,
    department: "",
    bio: "",
    profilePhotoUrl: null,
    logoUrl: null,
    backgroundImageUrl: null,
    backgroundColor: "#001138",
    accentColor: "#C9A96E",
    textColor: "#F4F1EA",
    cardMode: "standard",
    themeMode: "dark",
    layoutTemplate: "classic",
    primaryPhone: "",
    smsPhone: "",
    primaryEmail: owner?.email ?? "",
    websiteUrl: "https://actsto.org",
    mapsUrl: "",
    introVideoUrl: "",
    qrSettings: { foreground: "#001138", background: "#ffffff", size: 512 },
    leadFormSettings: DEFAULT_LEAD_FORM,
    mediaSettings: { profile_shape: "circle", profile_outline: true, content_align: "center" },
    sliderPages: [],
    automations: [{ id: uid(), trigger: "lead_submit", action: "notify_owner_email", enabled: true }],
    nfcStatus: "not_ordered",
    viewCount: 0,
    clickCount: 0,
    publishedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    links: [],
    sections: makeDefaultSections(),
  };
}

export const COLOR_PRESETS: { name: string; bg: string; accent: string; text: string }[] = [
  { name: "ACT Navy", bg: "#001138", accent: "#C9A96E", text: "#F4F1EA" },
  { name: "ACT Ink", bg: "#0b1220", accent: "#7FB3FF", text: "#F4F1EA" },
  { name: "Paper", bg: "#F4F1EA", accent: "#001138", text: "#141414" },
  { name: "Scholarship Green", bg: "#0f1c14", accent: "#C9A96E", text: "#f5f3ee" },
  { name: "Slate", bg: "#0f172a", accent: "#38bdf8", text: "#e2e8f0" },
  { name: "Crimson", bg: "#1a1416", accent: "#e0546a", text: "#f5eef0" },
];
