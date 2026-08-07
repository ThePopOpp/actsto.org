import { NextResponse } from "next/server";
import { pdf, Document, Page, Image as PdfImage } from "@react-pdf/renderer";
import React from "react";

import { getActSession } from "@/lib/auth/session-server";
import { coerceBlocks } from "@/lib/blog/blocks";
import { renderSocialPng } from "@/lib/social/render";
import { streamToBuffer } from "@/lib/admin/invoices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 1275 × 1650 is the largest postcard we offer; leave headroom, refuse posters. */
const MAX_DIMENSION = 4000;

/**
 * Renders a block document to a PNG or a print-ready PDF.
 *
 * Server-side via Satori rather than html2canvas in the browser: campaign photos
 * are remote, and a canvas that has drawn a cross-origin image is tainted and
 * refuses to export. Fetching the image server-side sidesteps that entirely, and
 * the output is identical on every machine.
 *
 * The PDF is the PNG placed on a page at the exact trim size, so a print vendor
 * gets real dimensions rather than "whatever the browser thought a page was".
 */
export async function POST(request: Request) {
  const session = await getActSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    blocks?: unknown;
    width?: unknown;
    height?: unknown;
    bgColor?: unknown;
    padding?: unknown;
    format?: unknown;
    filename?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const blocks = coerceBlocks(body.blocks);
  if (blocks.length === 0) {
    return NextResponse.json({ error: "Add at least one block before exporting." }, { status: 400 });
  }

  const width = Math.round(Number(body.width));
  const height = Math.round(Number(body.height));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return NextResponse.json({ error: "Invalid canvas size." }, { status: 400 });
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return NextResponse.json({ error: "That canvas is too large to export." }, { status: 413 });
  }

  const bgColor = typeof body.bgColor === "string" && /^#[0-9a-f]{3,8}$/i.test(body.bgColor)
    ? body.bgColor
    : "#ffffff";
  const padding = Number.isFinite(Number(body.padding))
    ? Math.max(0, Math.min(400, Math.round(Number(body.padding))))
    : undefined;
  const format = body.format === "pdf" ? "pdf" : "png";
  const filename = typeof body.filename === "string" && body.filename.trim()
    ? body.filename.trim().replace(/[^a-z0-9._-]/gi, "-").slice(0, 80)
    : "marketing";

  try {
    const png = await renderSocialPng(blocks, { width, height, bgColor, padding });

    if (format === "png") {
      return new NextResponse(png as unknown as BodyInit, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${filename}.png"`,
        },
      });
    }

    // @react-pdf works in points; the canvas is in pixels at 300dpi for print
    // sizes, so convert rather than handing it pixel counts as points.
    const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: { width: (width / 300) * 72, height: (height / 300) * 72 }, style: { padding: 0 } },
        React.createElement(PdfImage, { src: dataUrl, style: { width: "100%", height: "100%" } }),
      ),
    );
    const buffer = await streamToBuffer(await pdf(doc as never).toBuffer());

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[marketing/render]", error);
    return NextResponse.json({ error: "Could not render that design." }, { status: 502 });
  }
}
