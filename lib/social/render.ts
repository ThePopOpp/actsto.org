import "server-only";

import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { html } from "satori-html";

import { blocksToHtml, type BlogBlock } from "@/lib/blog/blocks";

/** Font families our block HTML references — all mapped to the same loaded font. */
const FAMILIES = ["Inter", "Georgia", "Arial", "Helvetica", "Times New Roman", "Trebuchet MS", "Courier New"];

let fontCache: { w400: ArrayBuffer; w700: ArrayBuffer } | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  const [r4, r7] = await Promise.all([
    fetch("https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf"),
    fetch("https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf"),
  ]);
  if (!r4.ok || !r7.ok) throw new Error("Could not load render fonts.");
  fontCache = { w400: await r4.arrayBuffer(), w700: await r7.arrayBuffer() };
  return fontCache;
}

/**
 * Render a social post's blocks to a PNG buffer at the exact pixel size, entirely
 * server-side (Satori → SVG → resvg → PNG). No headless browser; remote campaign
 * images are fetched server-side so there's no client CORS/taint issue.
 */
export async function renderSocialPng(
  blocks: BlogBlock[],
  opts: { width: number; height: number; bgColor: string; padding?: number },
): Promise<Buffer> {
  const fonts = await loadFonts();
  const pad = opts.padding ?? 64;
  const inner = blocksToHtml(blocks);
  const markup = html(
    `<div style="display:flex;flex-direction:column;width:100%;height:100%;padding:${pad}px;background:${opts.bgColor};box-sizing:border-box;font-family:Inter;">${inner}</div>`,
  );

  const fontEntries = FAMILIES.flatMap((name) => [
    { name, data: fonts.w400, weight: 400 as const, style: "normal" as const },
    { name, data: fonts.w700, weight: 700 as const, style: "normal" as const },
  ]);

  const svg = await satori(markup as Parameters<typeof satori>[0], {
    width: opts.width,
    height: opts.height,
    fonts: fontEntries,
  });

  const png = new Resvg(svg, { fitTo: { mode: "width", value: opts.width } }).render().asPng();
  return Buffer.from(png);
}
