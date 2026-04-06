import { prisma } from "@/lib/prisma";
import type { LegalSlug } from "@/lib/legal/slug";

/** When `html` is null, render the static body component on the page (avoids `react-dom/server` in RSC graph). */
export async function getPublicLegalHtml(slug: LegalSlug): Promise<{
  html: string | null;
  updatedAt: Date | null;
}> {
  const row = await prisma.legalDocument.findUnique({ where: { slug } });
  if (row) {
    return { html: row.bodyHtml, updatedAt: row.updatedAt };
  }
  return { html: null, updatedAt: null };
}
