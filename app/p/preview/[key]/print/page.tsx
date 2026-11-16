import type { Metadata } from "next";

import { BROWSER_FONTS, BROWSER_LOGOS } from "@/components/proposals/musk-scholars-fund/design";
import { OnePager } from "@/components/proposals/musk-scholars-fund/one-pager";
import { PrintToolbar } from "@/components/proposals/print-toolbar";
import { PREVIEW_METADATA, requirePreviewAccess } from "@/lib/proposals/preview-access";
import { signerOf } from "@/lib/proposals/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Print one-pager", ...PREVIEW_METADATA };

/**
 * The one-pager at true Letter size for the browser's Print / Save as PDF
 * (vector text, unlike the rasterized download). Super Admin only.
 */
export default async function ProposalPrintPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const proposal = await requirePreviewAccess(key);
  return (
    <div className="proposal-print min-h-screen bg-neutral-200 py-8 print:bg-white print:py-0">
      <style>{`
        @page { size: letter; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .proposal-print .no-print { display: none !important; }
          .proposal-print .sheet { box-shadow: none !important; margin: 0 !important; }
        }
        .proposal-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      <PrintToolbar backHref={`/dashboard/admin/proposals/${key}?tab=print`} />
      <div className="sheet mx-auto w-[816px] shadow-xl">
        {OnePager({ fonts: BROWSER_FONTS, logos: BROWSER_LOGOS, signer: signerOf(proposal) })}
      </div>
    </div>
  );
}
