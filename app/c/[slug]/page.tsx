import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { loadPublicCardBySlug, recordEvent } from "@/lib/business-cards/data";
import { PublicCard } from "./public-card";

export const dynamic = "force-dynamic";

function appBase(): string {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://actsto.org").replace(/\/$/, "");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const card = await loadPublicCardBySlug(slug).catch(() => null);
  if (!card) return { title: "Card not found" };
  const name = card.displayName || [card.firstName, card.lastName].filter(Boolean).join(" ") || "Digital Card";
  return {
    title: `${name} — Digital Business Card`,
    description: card.bio || `${name}${card.companyName ? ` · ${card.companyName}` : ""}`,
  };
}

export default async function PublicCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { slug } = await params;
  const { source } = await searchParams;

  const card = await loadPublicCardBySlug(slug);
  if (!card) notFound();

  const eventType = source === "qr" ? "qr_scan" : source === "nfc" ? "nfc_tap" : "view";
  await recordEvent({ cardId: card.id, eventType, source: source || "organic" }).catch(() => {});

  const publicUrl = `${appBase()}/c/${card.slug}`;
  return <PublicCard card={card} publicUrl={publicUrl} />;
}
