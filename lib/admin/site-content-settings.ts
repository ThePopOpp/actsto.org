export const SITE_CONTENT_KEY = "default";

export type AnnouncementBannerSettings = {
  enabled: boolean;
  message: string;
  href: string;
  tone: string;
};

export type HomepageHeroSettings = {
  headline: string;
  supportingText: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
};

export type SeoSocialSettings = {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  twitterHandle: string;
};

export type LegalKeyPagesSettings = {
  privacyPath: string;
  termsPath: string;
  taxDisclosurePath: string;
  contactPath: string;
};

export type FooterTrustSettings = {
  complianceText: string;
  copyrightOverride: string;
};

export type ResourcesBlogSettings = {
  intro: string;
  blogUrl: string;
};

export type FeaturedNavigationSettings = {
  label: string;
  href: string;
  description: string;
};

export type SiteContentSettingsPayload = {
  announcementBanner: AnnouncementBannerSettings;
  homepageHero: HomepageHeroSettings;
  seoSocial: SeoSocialSettings;
  legalKeyPages: LegalKeyPagesSettings;
  footerTrust: FooterTrustSettings;
  resourcesBlog: ResourcesBlogSettings;
  featuredNavigation: FeaturedNavigationSettings;
};

export const DEFAULT_SITE_CONTENT_SETTINGS: SiteContentSettingsPayload = {
  announcementBanner: {
    enabled: false,
    message: "Tax credit limits updated for 2026 - see How It Works for the latest figures.",
    href: "/how-it-works",
    tone: "info",
  },
  homepageHero: {
    headline: "Turn Your Taxes Into Private Christian Education",
    supportingText:
      "Arizona's tuition tax credit program lets you redirect state dollars to scholarships - at no net cost when you give up to your limit.",
    primaryLabel: "Donate Today",
    primaryUrl: "/campaigns",
    secondaryLabel: "Start a Campaign",
    secondaryUrl: "/campaigns/new",
  },
  seoSocial: {
    metaTitle: "Arizona Christian Tuition",
    metaDescription:
      "Support Arizona families with private Christian schooling through tax-credit eligible giving. Browse campaigns and give in minutes.",
    ogImage: "",
    twitterHandle: "@arizonachristiantuition",
  },
  legalKeyPages: {
    privacyPath: "/legal/privacy",
    termsPath: "/legal/terms",
    taxDisclosurePath: "/legal/terms/tax-disclosure",
    contactPath: "/contact",
  },
  footerTrust: {
    complianceText:
      "Arizona Christian Tuition is a certified School Tuition Organization (STO). Donations may qualify for Arizona tax credits.",
    copyrightOverride: "",
  },
  resourcesBlog: {
    intro: "Guides for families, donors, and schools - tax credits, campaigns, and compliance basics.",
    blogUrl: "https://arizonachristiantuition.com/blog/",
  },
  featuredNavigation: {
    label: "ACT Support",
    href: "/contact",
    description: "Call, email, or book time with our team.",
  },
};

const MAX_FIELD_BYTES = 8192;

function stringField(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  return value.slice(0, MAX_FIELD_BYTES);
}

function booleanField(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function objectField(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeSiteContentSettings(raw: unknown): SiteContentSettingsPayload {
  const root = objectField(raw);
  const banner = objectField(root.announcementBanner);
  const hero = objectField(root.homepageHero);
  const seo = objectField(root.seoSocial);
  const legal = objectField(root.legalKeyPages);
  const footer = objectField(root.footerTrust);
  const resources = objectField(root.resourcesBlog);
  const nav = objectField(root.featuredNavigation);

  return {
    announcementBanner: {
      enabled: booleanField(banner.enabled, DEFAULT_SITE_CONTENT_SETTINGS.announcementBanner.enabled),
      message: stringField(banner.message, DEFAULT_SITE_CONTENT_SETTINGS.announcementBanner.message),
      href: stringField(banner.href, DEFAULT_SITE_CONTENT_SETTINGS.announcementBanner.href),
      tone: stringField(banner.tone, DEFAULT_SITE_CONTENT_SETTINGS.announcementBanner.tone),
    },
    homepageHero: {
      headline: stringField(hero.headline, DEFAULT_SITE_CONTENT_SETTINGS.homepageHero.headline),
      supportingText: stringField(hero.supportingText, DEFAULT_SITE_CONTENT_SETTINGS.homepageHero.supportingText),
      primaryLabel: stringField(hero.primaryLabel, DEFAULT_SITE_CONTENT_SETTINGS.homepageHero.primaryLabel),
      primaryUrl: stringField(hero.primaryUrl, DEFAULT_SITE_CONTENT_SETTINGS.homepageHero.primaryUrl),
      secondaryLabel: stringField(hero.secondaryLabel, DEFAULT_SITE_CONTENT_SETTINGS.homepageHero.secondaryLabel),
      secondaryUrl: stringField(hero.secondaryUrl, DEFAULT_SITE_CONTENT_SETTINGS.homepageHero.secondaryUrl),
    },
    seoSocial: {
      metaTitle: stringField(seo.metaTitle, DEFAULT_SITE_CONTENT_SETTINGS.seoSocial.metaTitle),
      metaDescription: stringField(seo.metaDescription, DEFAULT_SITE_CONTENT_SETTINGS.seoSocial.metaDescription),
      ogImage: stringField(seo.ogImage, DEFAULT_SITE_CONTENT_SETTINGS.seoSocial.ogImage),
      twitterHandle: stringField(seo.twitterHandle, DEFAULT_SITE_CONTENT_SETTINGS.seoSocial.twitterHandle),
    },
    legalKeyPages: {
      privacyPath: stringField(legal.privacyPath, DEFAULT_SITE_CONTENT_SETTINGS.legalKeyPages.privacyPath),
      termsPath: stringField(legal.termsPath, DEFAULT_SITE_CONTENT_SETTINGS.legalKeyPages.termsPath),
      taxDisclosurePath: stringField(legal.taxDisclosurePath, DEFAULT_SITE_CONTENT_SETTINGS.legalKeyPages.taxDisclosurePath),
      contactPath: stringField(legal.contactPath, DEFAULT_SITE_CONTENT_SETTINGS.legalKeyPages.contactPath),
    },
    footerTrust: {
      complianceText: stringField(footer.complianceText, DEFAULT_SITE_CONTENT_SETTINGS.footerTrust.complianceText),
      copyrightOverride: stringField(footer.copyrightOverride, DEFAULT_SITE_CONTENT_SETTINGS.footerTrust.copyrightOverride),
    },
    resourcesBlog: {
      intro: stringField(resources.intro, DEFAULT_SITE_CONTENT_SETTINGS.resourcesBlog.intro),
      blogUrl: stringField(resources.blogUrl, DEFAULT_SITE_CONTENT_SETTINGS.resourcesBlog.blogUrl),
    },
    featuredNavigation: {
      label: stringField(nav.label, DEFAULT_SITE_CONTENT_SETTINGS.featuredNavigation.label),
      href: stringField(nav.href, DEFAULT_SITE_CONTENT_SETTINGS.featuredNavigation.href),
      description: stringField(nav.description, DEFAULT_SITE_CONTENT_SETTINGS.featuredNavigation.description),
    },
  };
}

export type SiteContentSection = keyof SiteContentSettingsPayload;

export function isSiteContentSection(value: string): value is SiteContentSection {
  return value in DEFAULT_SITE_CONTENT_SETTINGS;
}
