import { NextResponse } from "next/server";

import { requireProposalAdmin } from "@/lib/proposals/admin-api";
import { fileResponse, deckPdf } from "@/lib/proposals/musk-scholars-fund/assets";
import { signerOf } from "@/lib/proposals/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The slide deck PDF (nine 16:9 pages). Super Admin only; works while the public link is off. ?inline=1 opens it in the browser. */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const auth = await requireProposalAdmin(key);
  if (!auth.ok) return auth.response;
  try {
    const inline = new URL(request.url).searchParams.get("inline") === "1";
    return fileResponse(await deckPdf(signerOf(auth.proposal)), "application/pdf", "musk-scholars-fund-deck.pdf", inline);
  } catch (error) {
    console.error("[proposal asset]", error);
    return NextResponse.json({ error: "Could not create the file. Try again." }, { status: 502 });
  }
}
