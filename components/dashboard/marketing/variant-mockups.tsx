"use client";

import { FACE_SAFE_CROP, cn } from "@/lib/utils";
import { formatMoney, type MarketingContent } from "@/lib/marketing/campaign-content";
import type { MarketingVariant } from "@/lib/marketing/design-variants";

/**
 * Small, honest thumbnails of a design variant applied to each channel.
 *
 * These are mockups, not the builders — they exist so a parent can compare three
 * designs across three channels on one screen without opening nine editors. They
 * read from the same variant tokens the real output uses, so what you pick here
 * is what you get there.
 *
 * Inline styles rather than Tailwind classes because the variant colours are
 * runtime values; a class name can't carry them.
 */

function Photo({ content, className }: { content: MarketingContent; className?: string }) {
  if (!content.imageUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote campaign photo, no loader configured for it
    <img
      src={content.imageUrl}
      alt=""
      className={cn("w-full object-cover", FACE_SAFE_CROP, className)}
    />
  );
}

function ProgressBar({ content, variant }: { content: MarketingContent; variant: MarketingVariant }) {
  return (
    <div className="mt-auto pt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: variant.line }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(3, content.percent)}%`, background: variant.accent }}
        />
      </div>
      <p className="mt-1 text-[9px] font-medium" style={{ color: variant.inkSoft }}>
        {formatMoney(content.raised)} of {formatMoney(content.goal)} · {content.percent}%
      </p>
    </div>
  );
}

/** 6×4 landscape, the standard postcard face. */
export function PostcardMockup({
  variant,
  content,
  className,
}: {
  variant: MarketingVariant;
  content: MarketingContent;
  className?: string;
}) {
  const photoLed = variant.heroWeight === "dominant";
  return (
    <div
      className={cn("flex aspect-[3/2] w-full flex-col overflow-hidden", className)}
      style={{ background: variant.surface, borderRadius: variant.radius }}
    >
      {photoLed ? <Photo content={content} className="h-[52%] shrink-0" /> : null}
      <div
        className="flex min-h-0 flex-1 flex-col px-3 py-2.5"
        style={{ background: photoLed ? variant.surface : variant.band }}
      >
        {variant.kicker ? (
          <p
            className="text-[7px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: photoLed ? variant.accent : variant.bandInk, opacity: photoLed ? 1 : 0.85 }}
          >
            {variant.kicker}
          </p>
        ) : null}
        <p
          className="font-heading text-[11px] font-bold leading-tight"
          style={{
            color: photoLed ? variant.ink : variant.bandInk,
            fontSize: variant.titleSize / 2.6,
          }}
        >
          {content.title}
        </p>
        <p
          className="mt-0.5 line-clamp-2 text-[8px] leading-snug"
          style={{ color: photoLed ? variant.inkSoft : variant.bandInk, opacity: photoLed ? 1 : 0.85 }}
        >
          {content.tagline || content.excerpt}
        </p>
        {!photoLed ? <Photo content={content} className="mt-1.5 h-10 shrink-0 rounded" /> : null}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <span
            className="inline-block px-2 py-1 text-[7px] font-semibold"
            style={{
              background: variant.accent,
              color: variant.accentInk,
              borderRadius: variant.radius,
            }}
          >
            Give today
          </span>
          <span
            className="truncate text-[7px]"
            style={{ color: photoLed ? variant.inkSoft : variant.bandInk, opacity: 0.85 }}
          >
            actsto.org
          </span>
        </div>
      </div>
    </div>
  );
}

/** 1080×1350 feed post, the shape Instagram and Facebook both accept. */
export function SocialMockup({
  variant,
  content,
  className,
}: {
  variant: MarketingVariant;
  content: MarketingContent;
  className?: string;
}) {
  return (
    <div
      className={cn("flex aspect-[4/5] w-full flex-col overflow-hidden", className)}
      style={{ background: variant.canvas, borderRadius: variant.radius }}
    >
      <Photo
        content={content}
        className={variant.heroWeight === "dominant" ? "h-[58%] shrink-0" : "h-[34%] shrink-0"}
      />
      <div className="flex min-h-0 flex-1 flex-col px-3 py-3" style={{ background: variant.surface }}>
        {variant.kicker ? (
          <p
            className="text-[7px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: variant.accent }}
          >
            {variant.kicker}
          </p>
        ) : null}
        <p
          className="font-heading font-bold leading-tight"
          style={{ color: variant.ink, fontSize: variant.titleSize / 2.4 }}
        >
          {content.title}
        </p>
        <p className="mt-1 line-clamp-3 text-[8px] leading-snug" style={{ color: variant.inkSoft }}>
          {content.excerpt || content.tagline}
        </p>
        <ProgressBar content={content} variant={variant} />
      </div>
    </div>
  );
}

/** Email thumbnail: the header band and first lines, at postcard scale. */
export function EmailMockup({
  variant,
  content,
  className,
}: {
  variant: MarketingVariant;
  content: MarketingContent;
  className?: string;
}) {
  const bandFirst = variant.heroWeight !== "dominant";
  const band = (
    <div
      key="band"
      className="shrink-0 px-3 py-2.5"
      style={{ background: variant.band }}
    >
      {variant.kicker ? (
        <p
          className="text-[7px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: variant.band === variant.surface ? variant.accent : variant.bandInk, opacity: 0.9 }}
        >
          {variant.kicker}
        </p>
      ) : null}
      <p
        className="font-heading font-bold leading-tight"
        style={{
          color: variant.band === variant.surface ? variant.ink : variant.bandInk,
          fontSize: variant.titleSize / 2.6,
        }}
      >
        {content.title}
      </p>
    </div>
  );
  const photo = <Photo key="photo" content={content} className="h-[34%] shrink-0" />;

  return (
    <div
      className={cn("flex aspect-[3/4] w-full flex-col overflow-hidden p-2", className)}
      style={{ background: variant.canvas }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{
          background: variant.surface,
          borderRadius: variant.radius,
          border: variant.canvas === variant.surface ? `1px solid ${variant.line}` : undefined,
        }}
      >
        {bandFirst ? [band, photo] : [photo, band]}
        <div className="flex min-h-0 flex-1 flex-col gap-1 px-3 py-2.5">
          {[100, 92, 78].map((w) => (
            <span
              key={w}
              className="block h-1 rounded-full"
              style={{ width: `${w}%`, background: variant.line }}
            />
          ))}
          <span
            className="mt-2 inline-block w-fit px-2.5 py-1 text-[7px] font-semibold"
            style={{ background: variant.accent, color: variant.accentInk, borderRadius: variant.radius }}
          >
            Give today
          </span>
        </div>
      </div>
    </div>
  );
}
