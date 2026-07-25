import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Campaigns + their images, for the social composer's dynamic pull. */
export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const campaigns = await prisma.campaign
    .findMany({
      where: { status: { in: ["active", "pending_review", "draft", "completed"] } },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true, title: true, slug: true, tagline: true, shortExcerpt: true,
        goalAmount: true, raisedAmount: true, donorCount: true, featuredImageUrl: true,
        city: true, state: true,
        campaignMedia: { where: { mediaType: { in: ["featured_image", "gallery_image"] }, fileUrl: { not: null } }, orderBy: { sortOrder: "asc" }, select: { fileUrl: true, altText: true } },
      },
    })
    .catch(() => []);

  return NextResponse.json({
    campaigns: campaigns.map((c) => {
      const images = Array.from(new Set([c.featuredImageUrl, ...c.campaignMedia.map((m) => m.fileUrl)].filter(Boolean))) as string[];
      const goal = Number(c.goalAmount);
      const raised = Number(c.raisedAmount);
      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        tagline: c.tagline,
        excerpt: c.shortExcerpt,
        goalAmount: goal,
        raisedAmount: raised,
        donorCount: c.donorCount,
        percent: goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0,
        featuredImageUrl: c.featuredImageUrl,
        location: [c.city, c.state].filter(Boolean).join(", "),
        images,
      };
    }),
  });
}
