import type { Metadata } from "next";

import { ProposalLanding } from "@/components/proposals/musk-scholars-fund/landing";
import { PREVIEW_METADATA, requirePreviewAccess } from "@/lib/proposals/preview-access";
import { signerOf } from "@/lib/proposals/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Proposal preview", ...PREVIEW_METADATA };

/** Super Admin preview of the landing page; works while the public link is off. Views aren't counted. */
export default async function ProposalPreviewPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const proposal = await requirePreviewAccess(key);
  return <ProposalLanding signer={signerOf(proposal)} onePagerHref={`/api/admin/proposals/${key}/one-pager.pdf?inline=1`} />;
}
