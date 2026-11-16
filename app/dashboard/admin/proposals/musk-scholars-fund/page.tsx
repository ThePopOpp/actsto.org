import { redirect } from "next/navigation";
import { Download, ExternalLink, MonitorPlay, Printer } from "lucide-react";

import { AdminPageTabLinks, type AdminPageTabLink } from "@/components/dashboard/admin/admin-page-tab-links";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { CopyButton } from "@/components/proposals/admin/copy-button";
import { ProposalEmailPanel } from "@/components/proposals/admin/email-panel";
import { ProposalOverviewPanel } from "@/components/proposals/admin/overview-panel";
import { Scaled } from "@/components/proposals/admin/scaled";
import { SLIDES, SLIDE_SIZE } from "@/components/proposals/musk-scholars-fund/deck-slides";
import { BROWSER_FONTS, BROWSER_LOGOS } from "@/components/proposals/musk-scholars-fund/design";
import { OnePager, ONE_PAGER_SIZE } from "@/components/proposals/musk-scholars-fund/one-pager";
import { XCard, X_CARD_SIZE } from "@/components/proposals/musk-scholars-fund/x-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { DEFAULT_SUBJECT } from "@/lib/proposals/musk-scholars-fund/email";
import { PROPOSAL_KEY, PROPOSAL_TITLE, X_POST_TEXT } from "@/lib/proposals/musk-scholars-fund/content";
import { getOrCreateProposal, proposalUrl, proposalViewStats, signerOf } from "@/lib/proposals/server";

export const dynamic = "force-dynamic";

type Tab = "overview" | "landing" | "email" | "print" | "deck" | "x-card";
const tabs: AdminPageTabLink<Tab>[] = [
  { id: "overview", label: "Overview" },
  { id: "landing", label: "Landing page" },
  { id: "email", label: "Email" },
  { id: "print", label: "Print" },
  { id: "deck", label: "Slide deck" },
  { id: "x-card", label: "X card" },
];
const BASE = `/dashboard/admin/proposals/${PROPOSAL_KEY}`;
const API = `/api/admin/proposals/${PROPOSAL_KEY}`;
const PREVIEW = `/p/preview/${PROPOSAL_KEY}`;

const linkButton =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted";
const primaryButton = "inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90";

export default async function MuskScholarsFundAdminPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const session = await getActSession().catch(() => null);
  if (!session || session.role !== "super_admin") redirect(`/login?next=${BASE}&role=super_admin`);

  const params = searchParams ? await searchParams : {};
  const active: Tab = tabs.some((t) => t.id === params.tab) ? (params.tab as Tab) : "overview";
  const proposal = await getOrCreateProposal(PROPOSAL_KEY);
  const signer = signerOf(proposal);
  const design = { fonts: BROWSER_FONTS, logos: BROWSER_LOGOS, signer };

  return (
    <>
      <AdminPageHeader
        title={PROPOSAL_TITLE}
        description="A private $5M proposal to Elon Musk: a link-only landing page, the email, a print one-pager, a slide deck and an X card, all from one set of words and numbers."
      />
      <div className="space-y-6">
        <AdminPageTabLinks tabs={tabs} activeTab={active} baseHref={BASE} />
        <Alert>
          <AlertDescription>
            Before sharing: check the claims about Mr. Musk (the 2024 quote, Ad Astra, the Musk Foundation figure) and the STO figures against the
            sources listed on the one-pager. Every version says the proposal isn&apos;t an endorsement.
          </AlertDescription>
        </Alert>

        {active === "overview" ? (
          <ProposalOverviewPanel
            proposalKey={PROPOSAL_KEY}
            url={proposalUrl(proposal.token)}
            enabled={proposal.enabled}
            signer={signer}
            stats={await proposalViewStats(proposal.id)}
            updatedByEmail={proposal.updatedByEmail}
          />
        ) : null}

        {active === "landing" ? (
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-primary">Landing page</CardTitle>
              <CardDescription>What someone with the private link sees. This preview works while the link is off and isn&apos;t counted as a view.</CardDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <a href={PREVIEW} target="_blank" rel="noopener" className={linkButton}>
                  <ExternalLink className="size-4" /> Open full page
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <iframe title="Landing page preview" src={PREVIEW} className="h-[900px] w-full rounded-md border border-border bg-white" />
            </CardContent>
          </Card>
        ) : null}

        {active === "email" ? (
          <ProposalEmailPanel proposalKey={PROPOSAL_KEY} defaultSubject={DEFAULT_SUBJECT} linkLive={proposal.enabled} adminEmail={session.email} />
        ) : null}

        {active === "print" ? (
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-primary">Print one-pager</CardTitle>
              <CardDescription>
                US Letter. Print opens a page sized for the browser&apos;s Print or Save as PDF, with sharp text. The download is a 300 dpi PDF to send
                to a printer or attach to an email.
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <a href={`${PREVIEW}/print`} target="_blank" rel="noopener" className={primaryButton}>
                  <Printer className="size-4" /> Print
                </a>
                <a href={`${API}/one-pager.pdf`} className={linkButton}>
                  <Download className="size-4" /> Download PDF
                </a>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Scaled width={ONE_PAGER_SIZE.width} height={ONE_PAGER_SIZE.height} scale={0.75}>
                {OnePager(design)}
              </Scaled>
            </CardContent>
          </Card>
        ) : null}

        {active === "deck" ? (
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-primary">Slide deck</CardTitle>
              <CardDescription>Nine 16:9 slides. Present runs full screen in the browser (arrow keys, F for full screen). The PDF has one slide per page.</CardDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <a href={`${PREVIEW}/present`} target="_blank" rel="noopener" className={primaryButton}>
                  <MonitorPlay className="size-4" /> Present
                </a>
                <a href={`${API}/deck.pdf`} className={linkButton}>
                  <Download className="size-4" /> Download PDF
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {SLIDES.map((slide, i) => (
                  <div key={i} className="space-y-1">
                    <Scaled width={SLIDE_SIZE.width} height={SLIDE_SIZE.height} scale={0.2}>
                      {slide(design)}
                    </Scaled>
                    <p className="text-xs text-muted-foreground">Slide {i + 1}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {active === "x-card" ? (
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-primary">X post card</CardTitle>
              <CardDescription>1600 × 900 PNG for a post on X. Pair it with the text below.</CardDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                <a href={`${API}/x-card.png`} className={primaryButton}>
                  <Download className="size-4" /> Download PNG
                </a>
                <CopyButton text={X_POST_TEXT} label="Copy post text" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-x-auto">
              <Scaled width={X_CARD_SIZE.width} height={X_CARD_SIZE.height} scale={0.5}>
                {XCard(design)}
              </Scaled>
              <p className="max-w-2xl rounded-md border border-border bg-muted/40 p-3 text-sm">{X_POST_TEXT}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
