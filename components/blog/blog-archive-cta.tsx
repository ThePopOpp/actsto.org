import Link from "next/link";
import { HeartHandshake, UserPlus } from "lucide-react";

import { buttonVariants } from "@/lib/button-variants";
import { getCtaBlockByPlacement } from "@/lib/site-cta-blocks";
import { cn } from "@/lib/utils";

export async function BlogArchiveCta() {
  const cta = await getCtaBlockByPlacement("blog_archive_bottom");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-primary/10 via-act-banner/30 to-background ring-1 ring-foreground/5 dark:from-primary/20 dark:via-act-banner/10">
        <div className="grid gap-8 px-6 py-12 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12 lg:py-14">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
              {cta?.heading ?? "Ready to fund a Christ-centered education?"}
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground leading-relaxed">
              {cta?.body ??
                "Start a campaign for your family, make a tax-credit gift, or explore active fundraisers on Arizona Christian Tuition-all in one place."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-col xl:flex-row">
            <Link
              href={cta?.primaryUrl ?? "/register"}
              className={cn(buttonVariants({ size: "lg" }), "inline-flex gap-2 shadow-sm")}
            >
              <UserPlus className="size-4 shrink-0" aria-hidden />
              {cta?.primaryLabel ?? "Create an account"}
            </Link>
            {cta?.showSecondary && cta.secondaryUrl && cta.secondaryLabel ? (
              <Link
                href={cta.secondaryUrl}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "inline-flex gap-2 border-primary bg-background text-primary hover:bg-primary/5"
                )}
              >
                <HeartHandshake className="size-4 shrink-0" aria-hidden />
                {cta.secondaryLabel}
              </Link>
            ) : null}
            <Link href="/how-it-works" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "text-primary")}>
              How tax credits work
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
