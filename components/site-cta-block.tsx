import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/lib/button-variants";
import type { SiteCtaBlockData } from "@/lib/site-cta-block-types";
import { cn } from "@/lib/utils";

function variantName(value: string) {
  if (["default", "secondary", "outline", "ghost", "cta"].includes(value)) {
    return value as "default" | "secondary" | "outline" | "ghost" | "cta";
  }
  return "default";
}

function paddingClass(value: string) {
  if (value === "compact") return "py-8 sm:py-10";
  if (value === "spacious") return "py-16 sm:py-20";
  return "py-12 sm:py-16";
}

export function SiteCtaBlock({
  block,
  className,
  darkBand = false,
}: {
  block: SiteCtaBlockData;
  className?: string;
  darkBand?: boolean;
}) {
  if (!block.visible) return null;

  const style = {
    background: block.useGradient && block.bgColorEnd
      ? `linear-gradient(135deg, ${block.bgColor || "var(--primary)"}, ${block.bgColorEnd})`
      : block.bgColor || undefined,
    color: block.textColor || undefined,
  } as CSSProperties;

  return (
    <section
      className={cn(
        darkBand ? "bg-primary text-primary-foreground dark:bg-[oklch(0.3_0.09_264)] dark:text-white" : "bg-background",
        paddingClass(block.padding),
        className,
      )}
      style={style}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center">
        <div className="max-w-2xl">
          {block.subheading ? (
            <p className="text-xs font-semibold tracking-wide text-act-red uppercase">{block.subheading}</p>
          ) : null}
          <h2 className={cn("font-heading text-3xl font-semibold sm:text-4xl", darkBand ? "text-current" : "text-primary")}>
            {block.heading}
          </h2>
          {block.body ? (
            <p className={cn("mt-4 text-sm leading-relaxed sm:text-base", darkBand ? "text-current/85" : "text-muted-foreground")}>
              {block.body}
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row xl:shrink-0">
          <Link
            href={block.primaryUrl}
            className={cn(buttonVariants({ variant: variantName(block.primaryVariant), size: "lg" }), "gap-2")}
          >
            {block.primaryLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          {block.showSecondary && block.secondaryLabel && block.secondaryUrl ? (
            <Link
              href={block.secondaryUrl}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                darkBand && "border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
              )}
            >
              {block.secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
