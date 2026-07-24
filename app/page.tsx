import { HomeHero } from "@/components/home/home-hero";
import { HomeBelowHero } from "@/components/home/home-sections";
import { getSiteCampaigns } from "@/lib/campaigns-source";
import { getCtaBlockByPlacement } from "@/lib/site-cta-blocks";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [campaigns, heroCta] = await Promise.all([
    getSiteCampaigns(),
    getCtaBlockByPlacement("home_hero"),
  ]);

  return (
    <>
      <HomeHero
        cta={{
          subheading: heroCta?.subheading ?? null,
          // Preserve the existing hero buttons + URLs from the CTA block.
          primaryLabel: heroCta?.primaryLabel ?? null,
          primaryUrl: heroCta?.primaryUrl ?? null,
          secondaryLabel: heroCta?.secondaryLabel ?? null,
          secondaryUrl: heroCta?.secondaryUrl ?? null,
          showSecondary: heroCta?.showSecondary ?? null,
        }}
      />
      <HomeBelowHero campaigns={campaigns} />
    </>
  );
}
