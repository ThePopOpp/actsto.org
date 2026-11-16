import { NextResponse } from "next/server";

import { fileResponse, onePagerPdf } from "@/lib/proposals/musk-scholars-fund/assets";
import { PROPOSAL_KEY } from "@/lib/proposals/musk-scholars-fund/content";
import { findEnabledByToken, signerOf } from "@/lib/proposals/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The one-pager PDF for whoever holds the live link; 404 once it's switched off. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proposal = await findEnabledByToken(token);
  if (!proposal || proposal.key !== PROPOSAL_KEY) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    return fileResponse(await onePagerPdf(signerOf(proposal)), "application/pdf", "musk-scholars-fund.pdf", true);
  } catch (error) {
    console.error("[proposal one-pager]", error);
    return NextResponse.json({ error: "Could not create the PDF. Try again." }, { status: 502 });
  }
}
