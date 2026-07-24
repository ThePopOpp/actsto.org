import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { DEFAULT_LEAD_FORM, makeDefaultSections } from "@/lib/business-cards/defaults";
import type {
  BusinessCard,
  BusinessCardLead,
  BusinessCardLink,
  BusinessCardSection,
  CardStats,
  EventType,
  LeadFormSettings,
  LeadStatus,
  QrSettings,
  SaveCardPayload,
} from "@/lib/business-cards/types";

type Actor = { email: string; role: string };

const isAdmin = (actor: Actor) => actor.role === "super_admin";

// ── Mapping ───────────────────────────────────────────────────────────────────
type CardRow = Prisma.BusinessCardGetPayload<{ include: { links: true; sections: true } }>;

function toLink(l: CardRow["links"][number]): BusinessCardLink {
  return {
    id: l.id,
    cardId: l.cardId,
    label: l.label,
    url: l.url,
    linkType: l.linkType as BusinessCardLink["linkType"],
    icon: l.icon,
    displayOrder: l.displayOrder,
    isVisible: l.isVisible,
    openInNewTab: l.openInNewTab,
    clickCount: l.clickCount,
  };
}

function toSection(s: CardRow["sections"][number]): BusinessCardSection {
  return {
    id: s.id,
    cardId: s.cardId,
    sectionType: s.sectionType as BusinessCardSection["sectionType"],
    label: s.label,
    content: (s.content as Record<string, unknown>) ?? {},
    displayOrder: s.displayOrder,
    isVisible: s.isVisible,
    marginTop: s.marginTop,
    marginBottom: s.marginBottom,
    paddingTop: s.paddingTop,
    paddingBottom: s.paddingBottom,
  };
}

function toCard(row: CardRow): BusinessCard {
  return {
    id: row.id,
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
    slug: row.slug,
    cardName: row.cardName,
    status: row.status as BusinessCard["status"],
    isPublic: row.isPublic,
    displayName: row.displayName,
    firstName: row.firstName,
    lastName: row.lastName,
    jobTitle: row.jobTitle,
    companyName: row.companyName,
    department: row.department,
    bio: row.bio,
    profilePhotoUrl: row.profilePhotoUrl,
    logoUrl: row.logoUrl,
    backgroundImageUrl: row.backgroundImageUrl,
    backgroundColor: row.backgroundColor,
    accentColor: row.accentColor,
    textColor: row.textColor,
    cardMode: row.cardMode as BusinessCard["cardMode"],
    themeMode: row.themeMode as BusinessCard["themeMode"],
    layoutTemplate: row.layoutTemplate,
    primaryPhone: row.primaryPhone,
    smsPhone: row.smsPhone,
    primaryEmail: row.primaryEmail,
    websiteUrl: row.websiteUrl,
    mapsUrl: row.mapsUrl,
    introVideoUrl: row.introVideoUrl,
    qrSettings: (row.qrSettings as QrSettings) ?? {},
    leadFormSettings: normalizeLeadForm(row.leadFormSettings),
    mediaSettings: (row.mediaSettings as BusinessCard["mediaSettings"]) ?? {},
    sliderPages: Array.isArray(row.sliderPages) ? (row.sliderPages as unknown[]) : [],
    automations: Array.isArray(row.automations) ? (row.automations as BusinessCard["automations"]) : [],
    nfcStatus: row.nfcStatus,
    viewCount: row.viewCount,
    clickCount: row.clickCount,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    links: [...row.links].sort((a, b) => a.displayOrder - b.displayOrder).map(toLink),
    sections: [...row.sections].sort((a, b) => a.displayOrder - b.displayOrder).map(toSection),
  };
}

function normalizeLeadForm(value: Prisma.JsonValue): LeadFormSettings {
  const v = (value as Partial<LeadFormSettings>) ?? {};
  if (!v || typeof v !== "object" || !Array.isArray(v.fields)) return DEFAULT_LEAD_FORM;
  return { ...DEFAULT_LEAD_FORM, ...v, fields: v.fields as LeadFormSettings["fields"] };
}

// ── Public reads ──────────────────────────────────────────────────────────────
export async function loadPublicCardBySlug(slug: string): Promise<BusinessCard | null> {
  const row = await prisma.businessCard.findFirst({
    where: { slug, status: "published", isPublic: true },
    include: { links: true, sections: true },
  });
  return row ? toCard(row) : null;
}

export async function recordEvent(input: {
  cardId: string;
  eventType: EventType;
  source?: string;
  linkId?: string | null;
  deviceType?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await prisma.businessCardEvent.create({
    data: {
      cardId: input.cardId,
      eventType: input.eventType,
      source: input.source ?? "public_card",
      linkId: input.linkId ?? null,
      deviceType: input.deviceType ?? null,
      referrer: input.referrer ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
  if (input.eventType === "view" || input.eventType === "qr_scan" || input.eventType === "nfc_tap") {
    await prisma.businessCard.update({ where: { id: input.cardId }, data: { viewCount: { increment: 1 } } });
  } else if (input.eventType === "link_click") {
    await prisma.businessCard.update({ where: { id: input.cardId }, data: { clickCount: { increment: 1 } } });
    if (input.linkId) {
      await prisma.businessCardLink
        .update({ where: { id: input.linkId }, data: { clickCount: { increment: 1 } } })
        .catch(() => {});
    }
  }
}

// ── Dashboard reads ───────────────────────────────────────────────────────────
export async function listCards(actor: Actor, scope: "mine" | "all"): Promise<BusinessCard[]> {
  const where: Prisma.BusinessCardWhereInput =
    scope === "all" && isAdmin(actor) ? {} : { ownerEmail: { equals: actor.email, mode: "insensitive" } };
  const rows = await prisma.businessCard.findMany({
    where,
    include: { links: true, sections: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toCard);
}

export async function getCard(id: string, actor: Actor): Promise<BusinessCard | null> {
  const row = await prisma.businessCard.findUnique({ where: { id }, include: { links: true, sections: true } });
  if (!row) return null;
  if (!isAdmin(actor) && row.ownerEmail.toLowerCase() !== actor.email.toLowerCase()) return null;
  return toCard(row);
}

export async function getCardStats(actor: Actor, scope: "mine" | "all"): Promise<CardStats> {
  const cards = await listCards(actor, scope);
  const cardIds = cards.map((c) => c.id);
  const [shares, saves, leadRows] = await Promise.all([
    cardIds.length
      ? prisma.businessCardEvent.count({ where: { cardId: { in: cardIds }, eventType: "share" } })
      : Promise.resolve(0),
    cardIds.length
      ? prisma.businessCardEvent.count({ where: { cardId: { in: cardIds }, eventType: "save_contact" } })
      : Promise.resolve(0),
    cardIds.length
      ? prisma.businessCardLead.findMany({ where: { cardId: { in: cardIds } }, select: { status: true } })
      : Promise.resolve([] as { status: string }[]),
  ]);
  return {
    cards: cards.length,
    published: cards.filter((c) => c.status === "published").length,
    views: cards.reduce((n, c) => n + c.viewCount, 0),
    clicks: cards.reduce((n, c) => n + c.clickCount, 0),
    nfcReady: cards.filter((c) => c.nfcStatus === "linked" || c.nfcStatus === "active").length,
    shares,
    saves,
    leads: leadRows.length,
    newLeads: leadRows.filter((l) => l.status === "new").length,
  };
}

// ── Slugs ─────────────────────────────────────────────────────────────────────
function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || `card-${Math.random().toString(36).slice(2, 8)}`;
  let candidate = root;
  let n = 1;
  while (await prisma.businessCard.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${root}-${n++}`;
  }
  return candidate;
}

// ── Writes ────────────────────────────────────────────────────────────────────
function statusFields(status: string, current?: { isPublic: boolean; publishedAt: Date | null }) {
  if (status === "published") {
    return { isPublic: true, publishedAt: current?.publishedAt ?? new Date(), archivedAt: null };
  }
  if (status === "archived") return { isPublic: false, archivedAt: new Date() };
  if (status === "unpublished") return { isPublic: false };
  return {};
}

function scalarData(p: SaveCardPayload): Prisma.BusinessCardUncheckedUpdateInput {
  return {
    cardName: p.cardName ?? undefined,
    displayName: p.displayName ?? undefined,
    firstName: p.firstName ?? undefined,
    lastName: p.lastName ?? undefined,
    jobTitle: p.jobTitle ?? undefined,
    companyName: p.companyName ?? undefined,
    department: p.department ?? undefined,
    bio: p.bio ?? undefined,
    profilePhotoUrl: p.profilePhotoUrl ?? undefined,
    logoUrl: p.logoUrl ?? undefined,
    backgroundImageUrl: p.backgroundImageUrl ?? undefined,
    backgroundColor: p.backgroundColor ?? undefined,
    accentColor: p.accentColor ?? undefined,
    textColor: p.textColor ?? undefined,
    cardMode: p.cardMode ?? undefined,
    themeMode: p.themeMode ?? undefined,
    layoutTemplate: p.layoutTemplate ?? undefined,
    primaryPhone: p.primaryPhone ?? undefined,
    smsPhone: p.smsPhone ?? undefined,
    primaryEmail: p.primaryEmail ?? undefined,
    websiteUrl: p.websiteUrl ?? undefined,
    mapsUrl: p.mapsUrl ?? undefined,
    introVideoUrl: p.introVideoUrl ?? undefined,
    nfcStatus: p.nfcStatus ?? undefined,
    qrSettings: (p.qrSettings as Prisma.InputJsonValue) ?? undefined,
    leadFormSettings: (p.leadFormSettings as Prisma.InputJsonValue) ?? undefined,
    mediaSettings: (p.mediaSettings as Prisma.InputJsonValue) ?? undefined,
    sliderPages: (p.sliderPages as Prisma.InputJsonValue) ?? undefined,
    automations: (p.automations as Prisma.InputJsonValue) ?? undefined,
  };
}

function linkCreateRows(links: BusinessCardLink[] | undefined) {
  return (links ?? []).map((l, i) => ({
    label: l.label || "Link",
    url: l.url || "",
    linkType: l.linkType || "custom",
    icon: l.icon ?? null,
    displayOrder: l.displayOrder ?? i + 1,
    isVisible: l.isVisible ?? true,
    openInNewTab: l.openInNewTab ?? true,
  }));
}

function sectionCreateRows(sections: BusinessCardSection[] | undefined) {
  const list = sections && sections.length ? sections : makeDefaultSections();
  return list.map((s, i) => ({
    sectionType: s.sectionType,
    label: s.label,
    content: (s.content as Prisma.InputJsonValue) ?? {},
    displayOrder: s.displayOrder ?? i + 1,
    isVisible: s.isVisible ?? true,
    marginTop: s.marginTop ?? 0,
    marginBottom: s.marginBottom ?? 16,
    paddingTop: s.paddingTop ?? 0,
    paddingBottom: s.paddingBottom ?? 0,
  }));
}

export async function saveCard(
  payload: SaveCardPayload,
  actor: { email: string; name: string; role: string },
): Promise<BusinessCard> {
  const status = (payload.status ?? "draft") as string;

  // Update existing
  if (payload.id) {
    const existing = await prisma.businessCard.findUnique({
      where: { id: payload.id },
      select: { id: true, ownerEmail: true, isPublic: true, publishedAt: true, slug: true },
    });
    if (!existing) throw new Error("Card not found.");
    if (actor.role !== "super_admin" && existing.ownerEmail.toLowerCase() !== actor.email.toLowerCase()) {
      throw new Error("You do not own this card.");
    }
    let slug = existing.slug;
    if (payload.slug && slugify(payload.slug) && slugify(payload.slug) !== existing.slug) {
      slug = await uniqueSlug(payload.slug);
    }
    await prisma.businessCard.update({
      where: { id: payload.id },
      data: {
        ...scalarData(payload),
        slug,
        status,
        ...statusFields(status, { isPublic: existing.isPublic, publishedAt: existing.publishedAt }),
      },
    });
    if (payload.links) {
      await prisma.businessCardLink.deleteMany({ where: { cardId: payload.id } });
      if (payload.links.length) {
        await prisma.businessCardLink.createMany({
          data: linkCreateRows(payload.links).map((r) => ({ ...r, cardId: payload.id! })),
        });
      }
    }
    if (payload.sections) {
      await prisma.businessCardSection.deleteMany({ where: { cardId: payload.id } });
      await prisma.businessCardSection.createMany({
        data: sectionCreateRows(payload.sections).map((r) => ({ ...r, cardId: payload.id! })),
      });
    }
    const row = await prisma.businessCard.findUnique({
      where: { id: payload.id },
      include: { links: true, sections: true },
    });
    return toCard(row!);
  }

  // Create
  const slug = await uniqueSlug(payload.slug || payload.displayName || payload.cardName || `${actor.name}-card`);
  const created = await prisma.businessCard.create({
    data: {
      ...(scalarData(payload) as Prisma.BusinessCardUncheckedCreateInput),
      ownerEmail: actor.email.toLowerCase(),
      ownerName: actor.name,
      slug,
      status,
      ...statusFields(status),
      links: { create: linkCreateRows(payload.links) },
      sections: { create: sectionCreateRows(payload.sections) },
    },
    include: { links: true, sections: true },
  });
  return toCard(created);
}

export async function deleteCard(id: string, actor: Actor): Promise<void> {
  const row = await prisma.businessCard.findUnique({ where: { id }, select: { ownerEmail: true } });
  if (!row) return;
  if (!isAdmin(actor) && row.ownerEmail.toLowerCase() !== actor.email.toLowerCase()) {
    throw new Error("You do not own this card.");
  }
  await prisma.businessCard.delete({ where: { id } });
}

// ── Leads ─────────────────────────────────────────────────────────────────────
export async function listLeads(actor: Actor, scope: "mine" | "all"): Promise<BusinessCardLead[]> {
  const where: Prisma.BusinessCardLeadWhereInput =
    scope === "all" && isAdmin(actor)
      ? {}
      : { card: { ownerEmail: { equals: actor.email, mode: "insensitive" } } };
  const rows = await prisma.businessCardLead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { card: { select: { cardName: true, slug: true, displayName: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    cardId: r.cardId,
    ownerEmail: r.ownerEmail,
    name: r.name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    message: r.message,
    preferredContact: r.preferredContact,
    source: r.source,
    status: r.status as LeadStatus,
    createdAt: r.createdAt.toISOString(),
    card: r.card,
  }));
}

export async function updateLead(id: string, status: LeadStatus, actor: Actor): Promise<void> {
  const row = await prisma.businessCardLead.findUnique({
    where: { id },
    select: { card: { select: { ownerEmail: true } } },
  });
  if (!row) throw new Error("Lead not found.");
  if (!isAdmin(actor) && row.card.ownerEmail.toLowerCase() !== actor.email.toLowerCase()) {
    throw new Error("Not authorized.");
  }
  await prisma.businessCardLead.update({ where: { id }, data: { status } });
}

export async function deleteLead(id: string, actor: Actor): Promise<void> {
  const row = await prisma.businessCardLead.findUnique({
    where: { id },
    select: { card: { select: { ownerEmail: true } } },
  });
  if (!row) return;
  if (!isAdmin(actor) && row.card.ownerEmail.toLowerCase() !== actor.email.toLowerCase()) {
    throw new Error("Not authorized.");
  }
  await prisma.businessCardLead.delete({ where: { id } });
}

/** Public lead capture. Returns the card owner info so the API can run notifications. */
export async function createLead(input: {
  cardId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
}): Promise<{ ownerEmail: string; ownerName: string | null; cardName: string; displayName: string | null; automations: BusinessCard["automations"] } | null> {
  const card = await prisma.businessCard.findUnique({
    where: { id: input.cardId },
    select: { id: true, ownerEmail: true, ownerName: true, cardName: true, displayName: true, automations: true, isPublic: true },
  });
  if (!card || !card.isPublic) return null;
  await prisma.businessCardLead.create({
    data: {
      cardId: card.id,
      ownerEmail: card.ownerEmail,
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      company: input.company ?? null,
      message: input.message ?? null,
      payload: input as Prisma.InputJsonValue,
    },
  });
  await recordEvent({ cardId: card.id, eventType: "lead_submit" }).catch(() => {});
  return {
    ownerEmail: card.ownerEmail,
    ownerName: card.ownerName,
    cardName: card.cardName,
    displayName: card.displayName,
    automations: Array.isArray(card.automations) ? (card.automations as BusinessCard["automations"]) : [],
  };
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export async function getCardAnalytics(cardId: string, actor: Actor) {
  const card = await getCard(cardId, actor);
  if (!card) return null;
  const events = await prisma.businessCardEvent.groupBy({
    by: ["eventType"],
    where: { cardId },
    _count: { _all: true },
  });
  const byType: Record<string, number> = {};
  for (const e of events) byType[e.eventType] = e._count._all;

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const recent = await prisma.businessCardEvent.findMany({
    where: { cardId, createdAt: { gte: since } },
    select: { eventType: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    card: { id: card.id, cardName: card.cardName, slug: card.slug, viewCount: card.viewCount, clickCount: card.clickCount },
    byType,
    topLinks: card.links
      .filter((l) => l.clickCount > 0)
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, 8)
      .map((l) => ({ label: l.label, clicks: l.clickCount })),
    recent: recent.map((r) => ({ eventType: r.eventType, at: r.createdAt.toISOString() })),
  };
}
