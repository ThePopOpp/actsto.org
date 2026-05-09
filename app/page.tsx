import Link from "next/link";
import { Clock } from "lucide-react";

import { HomeBelowHero } from "@/components/home/home-sections";
import { buttonVariants } from "@/lib/button-variants";
import { getSiteCampaigns } from "@/lib/campaigns-source";
import { getCtaBlockByPlacement } from "@/lib/site-cta-blocks";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [campaigns, heroCta] = await Promise.all([
    getSiteCampaigns(),
    getCtaBlockByPlacement("home_hero"),
  ]);

  return (
    <>
      <div className="bg-background">
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20 lg:py-24">
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="size-4 shrink-0" aria-hidden />
            Donate Today - It Only Takes 3 Minutes
          </p>
          <h1 className="mt-6 font-heading text-4xl leading-tight font-semibold tracking-tight text-primary sm:text-5xl md:text-[3.25rem] md:leading-[1.15]">
            {heroCta?.heading ?? "Turn Your Arizona Taxes Into Private Christian Education & Tuition"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {heroCta?.subheading ??
              "Your state tax dollars can fund a child's education instead of the general fund. Through Arizona's tax credit program, you can give and get back."}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={heroCta?.primaryUrl ?? "/register"}
              className={cn(buttonVariants({ size: "lg" }), "min-w-[160px] px-6")}
            >
              {heroCta?.primaryLabel ?? "Get Started"}
            </Link>
            {heroCta?.showSecondary && heroCta.secondaryUrl && heroCta.secondaryLabel ? (
              <Link
                href={heroCta.secondaryUrl}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "min-w-[160px] border-primary bg-background text-primary hover:bg-primary/5",
                )}
              >
                {heroCta.secondaryLabel}
              </Link>
            ) : null}
          </div>
        </section>
      </div>
      <HomeBelowHero campaigns={campaigns} />
    </>
  );
}
