import "server-only";

import { SLIDES, SLIDE_SIZE } from "@/components/proposals/musk-scholars-fund/deck-slides";
import { RENDER_FONTS } from "@/components/proposals/musk-scholars-fund/design";
import { OnePager, ONE_PAGER_SIZE } from "@/components/proposals/musk-scholars-fund/one-pager";
import { XCard, X_CARD_SIZE } from "@/components/proposals/musk-scholars-fund/x-card";
import type { Signer } from "@/lib/proposals/musk-scholars-fund/content";
import { LETTER_POINTS, pngsToPdf, renderLogos, renderPng, WIDESCREEN_POINTS } from "@/lib/proposals/render";

/** The downloadable files, rendered on request from the same components the pages show. */

/** One Letter page at 300 dpi (816 px × 3.125). */
export async function onePagerPdf(signer: Signer): Promise<Buffer> {
  const props = { fonts: RENDER_FONTS, logos: await renderLogos(), signer };
  const png = await renderPng(OnePager(props), ONE_PAGER_SIZE, 300 / 96);
  return pngsToPdf([png], LETTER_POINTS, "The Musk Scholars Fund — one-pager");
}

/** Nine 16:9 pages at 1920×1080. */
export async function deckPdf(signer: Signer): Promise<Buffer> {
  const props = { fonts: RENDER_FONTS, logos: await renderLogos(), signer };
  const pngs: Buffer[] = [];
  for (const slide of SLIDES) pngs.push(await renderPng(slide(props), SLIDE_SIZE));
  return pngsToPdf(pngs, WIDESCREEN_POINTS, "The Musk Scholars Fund — deck");
}

/** The 1600×900 X card. */
export async function xCardPng(): Promise<Buffer> {
  return renderPng(XCard({ fonts: RENDER_FONTS, logos: await renderLogos() }), X_CARD_SIZE);
}

export function fileResponse(body: Buffer, contentType: string, filename: string, inline = false): Response {
  return new Response(body as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
