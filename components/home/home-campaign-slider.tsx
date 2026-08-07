"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CampaignCard } from "@/components/campaign-card";
import type { Campaign } from "@/lib/campaigns";
import { cn } from "@/lib/utils";

/**
 * Single-row campaign slider. Shows ~1.5 cards on mobile, ~2.5 on tablet, and 3
 * on desktop; the rest scroll horizontally (scroll-snap). Desktop nav arrows
 * appear only when the row overflows (i.e. more than 3 cards).
 */
export function HomeCampaignSlider({
  campaigns,
  keyPrefix,
  reverse = false,
}: {
  campaigns: Campaign[];
  keyPrefix: string;
  reverse?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const list = reverse ? [...campaigns].reverse() : campaigns;

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  function scroll(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.85 * dir, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        // items-stretch so every slide is as tall as the tallest in view; the
        // card fills it and pins its CTA to the bottom.
        className="-mx-4 flex snap-x snap-mandatory items-stretch gap-6 overflow-x-auto px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:gap-8 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {list.map((c) => (
          <div
            key={`${keyPrefix}${c.slug}`}
            className="w-[66%] shrink-0 snap-start sm:w-[40%] lg:w-[calc((100%-4rem)/3)]"
          >
            <CampaignCard campaign={c} variant="home" />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous campaigns"
        onClick={() => scroll(-1)}
        className={cn(
          "absolute top-[9rem] -left-4 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition hover:bg-muted lg:flex",
          canPrev ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        aria-label="More campaigns"
        onClick={() => scroll(1)}
        className={cn(
          "absolute top-[9rem] -right-4 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition hover:bg-muted lg:flex",
          canNext ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
