import type { Metadata } from "next";

import { DeckPresenter } from "@/components/proposals/musk-scholars-fund/deck-presenter";
import { PREVIEW_METADATA, requirePreviewAccess } from "@/lib/proposals/preview-access";
import { signerOf } from "@/lib/proposals/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Present: The Musk Scholars Fund", ...PREVIEW_METADATA };

/** Full-screen deck presenter. Super Admin only. */
export default async function ProposalPresentPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const proposal = await requirePreviewAccess(key);
  return <DeckPresenter signer={signerOf(proposal)} backHref={`/dashboard/admin/proposals/${key}?tab=deck`} />;
}
