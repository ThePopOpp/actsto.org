export const CTA_PLACEMENTS = [
  "home_hero",
  "home_new_campaigns",
  "home_pre_footer",
  "blog_archive_bottom",
  "campaigns_top",
  "how_it_works_hero",
  "how_it_works_individuals",
  "how_it_works_bottom",
  "about_hero",
  "about_mid",
  "about_bottom",
  "site_header_primary",
  "site_header_secondary",
  "site_header_mobile_extra",
  "custom_path",
] as const;

export type CtaPlacement = (typeof CTA_PLACEMENTS)[number];

export type SiteCtaBlockData = {
  key: string;
  placement: CtaPlacement | string;
  path?: string | null;
  heading: string;
  subheading?: string | null;
  body?: string | null;
  primaryLabel: string;
  primaryUrl: string;
  primaryVariant: string;
  showSecondary: boolean;
  secondaryLabel?: string | null;
  secondaryUrl?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  bgColor?: string | null;
  bgColorEnd?: string | null;
  useGradient: boolean;
  textColor?: string | null;
  padding: "compact" | "default" | "spacious" | string;
  visible: boolean;
  sortOrder: number;
};
