// Digital Business Card types — shared by the dashboard builder, API, and public
// page. Field names mirror the Prisma models (camelCase); JSON blobs keep their
// snake_case internal keys.

export type CardStatus = "draft" | "published" | "unpublished" | "archived";
export type CardMode = "standard" | "opener_slider" | "qr_only" | "nfc_landing";
export type ThemeMode = "light" | "dark" | "both";

export type LinkType =
  | "website" | "social" | "phone" | "email" | "sms" | "map"
  | "booking" | "payment" | "download" | "video" | "review" | "custom";

export type SectionType =
  | "opener" | "profile_header" | "quick_actions" | "links" | "lead_capture"
  | "video" | "qr_code" | "nfc" | "slideshow" | "steps";

export type EventType =
  | "view" | "share" | "like" | "qr_scan" | "nfc_tap"
  | "link_click" | "copy_link" | "save_contact" | "lead_submit";

export type LeadStatus = "new" | "contacted" | "qualified" | "archived";

export type StepItem = { id: string; title: string; description?: string };
export type SlideshowSlide = { id: string; image_url: string; caption?: string };

export type MediaSettings = {
  profile_shape?: "circle" | "rounded" | "square";
  profile_outline?: boolean;
  content_align?: "center" | "left";
  use_background_image?: boolean;
};

export type AutomationAction = "notify_owner_email" | "notify_owner_sms" | "autoreply_email";
export type Automation = {
  id: string;
  trigger: "lead_submit";
  action: AutomationAction;
  enabled: boolean;
  message?: string;
};

export type QrSettings = { foreground?: string; background?: string; size?: number; url?: string | null };

export type LeadFormField = {
  key: "name" | "email" | "phone" | "company" | "message";
  label: string;
  enabled: boolean;
  required: boolean;
};
export type LeadFormSettings = {
  enabled: boolean;
  title: string;
  description: string;
  button_label: string;
  submit_label: string;
  fields: LeadFormField[];
};

export type OpenerContent = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primary_label?: string;
  secondary_label?: string;
  duration_seconds?: number;
  logo_url?: string;
};

export type BusinessCardLink = {
  id: string;
  cardId?: string;
  label: string;
  url: string;
  linkType: LinkType;
  icon: string | null;
  displayOrder: number;
  isVisible: boolean;
  openInNewTab: boolean;
  clickCount: number;
};

export type BusinessCardSection = {
  id: string;
  cardId?: string;
  sectionType: SectionType;
  label: string;
  content: Record<string, unknown>;
  displayOrder: number;
  isVisible: boolean;
  marginTop: number;
  marginBottom: number;
  paddingTop: number;
  paddingBottom: number;
};

export type BusinessCard = {
  id: string;
  ownerEmail: string;
  ownerName: string | null;
  slug: string;
  cardName: string;
  status: CardStatus;
  isPublic: boolean;

  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  companyName: string | null;
  department: string | null;
  bio: string | null;

  profilePhotoUrl: string | null;
  logoUrl: string | null;
  backgroundImageUrl: string | null;

  backgroundColor: string;
  accentColor: string;
  textColor: string;
  cardMode: CardMode;
  themeMode: ThemeMode;
  layoutTemplate: string;

  primaryPhone: string | null;
  smsPhone: string | null;
  primaryEmail: string | null;
  websiteUrl: string | null;
  mapsUrl: string | null;
  introVideoUrl: string | null;

  qrSettings: QrSettings;
  leadFormSettings: LeadFormSettings;
  mediaSettings: MediaSettings;
  sliderPages: unknown[];
  automations: Automation[];

  nfcStatus: string;
  viewCount: number;
  clickCount: number;

  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;

  links: BusinessCardLink[];
  sections: BusinessCardSection[];
};

export type BusinessCardLead = {
  id: string;
  cardId: string;
  ownerEmail: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  preferredContact: string | null;
  source: string | null;
  status: LeadStatus;
  createdAt: string;
  card?: { cardName: string; slug: string; displayName: string | null } | null;
};

export type CardStats = {
  cards: number;
  published: number;
  views: number;
  clicks: number;
  nfcReady: number;
  shares: number;
  saves: number;
  leads: number;
  newLeads: number;
};

/** Shape the dashboard sends to POST /api/business-cards. */
export type SaveCardPayload = Partial<Omit<BusinessCard, "links" | "sections">> & {
  links?: BusinessCardLink[];
  sections?: BusinessCardSection[];
};
