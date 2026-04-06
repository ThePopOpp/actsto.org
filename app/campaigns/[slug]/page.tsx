import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ExternalLink } from "lucide-react";

import { CampaignBreadcrumbs } from "@/components/campaign/campaign-breadcrumbs";
import { CampaignDetailSidebar } from "@/components/campaign/campaign-detail-sidebar";
import { CampaignDetailTabs } from "@/components/campaign/campaign-detail-tabs";
import { CampaignPeopleSection } from "@/components/campaign/campaign-people-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCampaignBySlug,
  getCampaignGivingLevels,
  MOCK_CAMPAIGNS,
} from "@/lib/campaigns";
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return MOCK_CAMPAIGNS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getCampaignBySlug(slug);
  if (!c) return {};
  return { title: c.title };
}

export default async function CampaignDetailPage({ params }: Props) {
  const { slug } = await params;
  const c = getCampaignBySlug(slug);
  if (!c) notFound();

  const pct =
    c.goal > 0 ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arizonachristiantuition.com";
  const shareUrl = `${siteUrl}/campaigns/${c.slug}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

  const storySections = c.storySections ?? [];
  const tags = c.tags ?? [];
  const updateCount = c.updatesCount ?? 0;
  const givingLevels = getCampaignGivingLevels(c);
  const donationSubtitle =
    c.students[0] != null
      ? `${c.students[0].firstName} ${c.students[0].lastName} at ${c.students[0].school}`
      : `${c.title} at ${c.school.name}`;

  return (
    <div className="min-h-screen bg-muted/25">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <CampaignBreadcrumbs category={c.breadcrumbCategory} title={c.title} />

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
          <article className="min-w-0 space-y-6">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl shadow-sm ring-1 ring-foreground/10">
              {pct >= 100 ? (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-act-action px-3 py-1.5 text-xs font-semibold text-white shadow-md">
                  <span aria-hidden>✓</span> Fully funded
                </div>
              ) : null}
              <Image
                src={c.image}
                alt=""
                fill
                className="object-cover"
                priority
                sizes="(max-width:1024px) 100vw, 66vw"
              />
            </div>

            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((t, i) => (
                  <Badge
                    key={t}
                    variant={i === 0 ? "default" : "secondary"}
                    className="font-normal"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div>
              <h1 className="font-heading text-3xl font-semibold text-primary sm:text-4xl">
                {c.title}
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">{c.tagline}</p>
            </div>

            <Card className="border-border/80 shadow-sm ring-1 ring-foreground/5">
              <CardContent className="flex gap-4 p-5 sm:p-6">
                <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border">
                  {c.school.logo ? (
                    <Image src={c.school.logo} alt="" fill className="object-cover" sizes="56px" />
                  ) : (
                    <Building2 className="size-7 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-heading text-lg font-semibold text-primary">
                      {c.school.name}
                    </p>
                    <Link
                      href={c.school.website}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Open school website"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.excerpt}</p>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">{c.school.address}</p>
                </div>
              </CardContent>
            </Card>

            <CampaignPeopleSection parent={c.parent} students={c.students} />

            <CampaignDetailTabs
              storySections={storySections}
              description={c.description}
              updateCount={updateCount}
              donorCount={c.donorCount}
              gallery={c.gallery}
            />
          </article>

          <CampaignDetailSidebar
            campaignSlug={c.slug}
            campaignTitle={c.title}
            schoolName={c.school.name}
            donationSubtitle={donationSubtitle}
            goal={c.goal}
            raised={c.raised}
            donorCount={c.donorCount}
            daysLeft={c.daysLeft}
            endDate={c.endDate}
            pct={pct}
            qrSrc={qrSrc}
            givingLevels={givingLevels}
          />
        </div>
      </div>
    </div>
  );
}
