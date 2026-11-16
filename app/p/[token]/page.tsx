import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProposalLanding } from "@/components/proposals/musk-scholars-fund/landing";
import { ProposalViewBeacon } from "@/components/proposals/view-beacon";
import { PROPOSAL_KEY, PROPOSAL_TITLE } from "@/lib/proposals/musk-scholars-fund/content";
import { findEnabledByToken, signerOf } from "@/lib/proposals/server";

export const dynamic = "force-dynamic";

/**
 * A private proposal, reachable only by its secret link. Not linked anywhere,
 * never indexed (metadata here, X-Robots-Tag in next.config.ts), and a 404
 * when the link is switched off, regenerated, or simply wrong — the same 404
 * either way, so a guess learns nothing.
 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const proposal = await findEnabledByToken(token);
  return {
    title: proposal ? `${PROPOSAL_TITLE} · Arizona Christian Tuition` : "Not found",
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    referrer: "no-referrer",
  };
}

export default async function ProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proposal = await findEnabledByToken(token);
  if (!proposal || proposal.key !== PROPOSAL_KEY) notFound();

  return (
    <>
      <ProposalLanding signer={signerOf(proposal)} onePagerHref={`/p/${token}/one-pager.pdf`} />
      <ProposalViewBeacon token={token} />
    </>
  );
}
