import { NextResponse } from "next/server";

import {
  DEFAULT_SITE_CONTENT_SETTINGS,
  isSiteContentSection,
  normalizeSiteContentSettings,
  SITE_CONTENT_KEY,
  type SiteContentSettingsPayload,
} from "@/lib/admin/site-content-settings";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

function validUrl(value: string) {
  return value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://");
}

function validateSettings(settings: SiteContentSettingsPayload) {
  const urls = [
    settings.announcementBanner.href,
    settings.homepageHero.primaryUrl,
    settings.homepageHero.secondaryUrl,
    settings.legalKeyPages.privacyPath,
    settings.legalKeyPages.termsPath,
    settings.legalKeyPages.taxDisclosurePath,
    settings.legalKeyPages.contactPath,
    settings.resourcesBlog.blogUrl,
    settings.featuredNavigation.href,
  ];
  if (urls.some((url) => url && !validUrl(url))) {
    throw new Error("Links must be internal paths or full URLs.");
  }
}

async function getSettings() {
  const row = await prisma.siteContentSettings.findUnique({ where: { key: SITE_CONTENT_KEY } });
  return normalizeSiteContentSettings(row?.payload ?? null);
}

async function syncHomepageHero(settings: SiteContentSettingsPayload) {
  const hero = settings.homepageHero;
  await prisma.siteCtaBlock.upsert({
    where: { key: "home-hero-v1" },
    create: {
      key: "home-hero-v1",
      placement: "home_hero",
      heading: hero.headline,
      body: hero.supportingText,
      primaryLabel: hero.primaryLabel,
      primaryUrl: hero.primaryUrl,
      primaryVariant: "default",
      showSecondary: true,
      secondaryLabel: hero.secondaryLabel,
      secondaryUrl: hero.secondaryUrl,
      padding: "spacious",
      visible: true,
      useGradient: false,
      sortOrder: 10,
    },
    update: {
      heading: hero.headline,
      body: hero.supportingText,
      primaryLabel: hero.primaryLabel,
      primaryUrl: hero.primaryUrl,
      showSecondary: true,
      secondaryLabel: hero.secondaryLabel,
      secondaryUrl: hero.secondaryUrl,
    },
  });
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  return NextResponse.json({ payload: await getSettings() });
}

export async function PUT(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    section?: string;
    values?: unknown;
  } | null;

  if (!body?.section || !isSiteContentSection(body.section)) {
    return NextResponse.json({ error: "Unknown site content section." }, { status: 400 });
  }

  const current = await getSettings();
  const next = normalizeSiteContentSettings({
    ...current,
    [body.section]: {
      ...current[body.section],
      ...(body.values && typeof body.values === "object" && !Array.isArray(body.values) ? body.values : {}),
    },
  });

  try {
    validateSettings(next);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid site content settings." },
      { status: 400 },
    );
  }

  await prisma.siteContentSettings.upsert({
    where: { key: SITE_CONTENT_KEY },
    create: { key: SITE_CONTENT_KEY, payload: next },
    update: { payload: next },
  });

  if (body.section === "homepageHero") {
    await syncHomepageHero(next);
  }

  return NextResponse.json({ ok: true, payload: next });
}
