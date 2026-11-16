import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { Document, Image as PdfImage, Page, pdf } from "@react-pdf/renderer";
import { Resvg } from "@resvg/resvg-js";
import React, { type ReactNode } from "react";
import satori from "satori";

import type { DesignLogos } from "@/components/proposals/musk-scholars-fund/design";

/**
 * Render the proposal designs (components/proposals/*) to PNG and PDF on the
 * server: Satori draws the same React markup the browser shows, resvg
 * rasterizes it, and @react-pdf places each PNG on a page. Same pipeline as
 * app/api/marketing/render, with the proposal's own fonts.
 */

const FONT_BASE = "https://cdn.jsdelivr.net/fontsource/fonts";
const FONT_FILES = [
  { name: "Fraunces", weight: 600, file: "fraunces@latest/latin-600-normal.ttf" },
  { name: "Fraunces", weight: 700, file: "fraunces@latest/latin-700-normal.ttf" },
  { name: "Geist", weight: 400, file: "geist-sans@latest/latin-400-normal.ttf" },
  { name: "Geist", weight: 500, file: "geist-sans@latest/latin-500-normal.ttf" },
  { name: "Geist", weight: 600, file: "geist-sans@latest/latin-600-normal.ttf" },
  { name: "Geist", weight: 700, file: "geist-sans@latest/latin-700-normal.ttf" },
] as const;

type SatoriFont = { name: string; data: ArrayBuffer; weight: 400 | 500 | 600 | 700; style: "normal" };
let fontCache: Promise<SatoriFont[]> | null = null;

function loadFonts(): Promise<SatoriFont[]> {
  fontCache ??= Promise.all(
    FONT_FILES.map(async (f) => {
      const res = await fetch(`${FONT_BASE}/${f.file}`);
      if (!res.ok) throw new Error(`Could not load the ${f.name} ${f.weight} font.`);
      return { name: f.name, data: await res.arrayBuffer(), weight: f.weight, style: "normal" as const };
    }),
  ).catch((error) => {
    fontCache = null; // try again next time rather than caching the failure
    throw error;
  });
  return fontCache;
}

let logoCache: Promise<DesignLogos> | null = null;

/** The ACT wordmarks as data URIs, with a fixed size so resvg can scale them. */
export function renderLogos(): Promise<DesignLogos> {
  logoCache ??= (async () => {
    const read = async (file: string) => {
      const svg = (await readFile(path.join(process.cwd(), "public", file), "utf8")).replace(
        /width="100%" height="100%"/,
        'width="198" height="49"',
      );
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    };
    return { onLight: await read("actsto-logo-light.svg"), onDark: await read("actsto-logo-dark.svg") };
  })();
  return logoCache;
}

/** One design to a PNG. `scale` multiplies the pixel size (3.125 = 300 dpi for a 96-dpi page). */
export async function renderPng(element: ReactNode, size: { width: number; height: number }, scale = 1): Promise<Buffer> {
  const svg = await satori(element as Parameters<typeof satori>[0], {
    width: size.width,
    height: size.height,
    fonts: await loadFonts(),
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: Math.round(size.width * scale) } }).render().asPng();
  return Buffer.from(png);
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "binary"));
  }
  return Buffer.concat(chunks);
}

/** PNG pages into a PDF; `page` is in points (72 per inch). */
export async function pngsToPdf(pngs: Buffer[], page: { width: number; height: number }, title: string): Promise<Buffer> {
  const doc = React.createElement(
    Document,
    { title, author: "Arizona Christian Tuition", creator: "actsto.org" },
    pngs.map((png, i) =>
      React.createElement(
        Page,
        { key: i, size: page, style: { padding: 0 } },
        React.createElement(PdfImage, {
          src: `data:image/png;base64,${png.toString("base64")}`,
          style: { width: page.width, height: page.height },
        }),
      ),
    ),
  );
  return streamToBuffer(await pdf(doc as never).toBuffer());
}

export const LETTER_POINTS = { width: 612, height: 792 };
export const WIDESCREEN_POINTS = { width: 960, height: 540 };
