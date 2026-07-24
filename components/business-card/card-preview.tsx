"use client";

// Presentational card body — shared by the public page and the builder preview.
// No network calls; the parent supplies handlers for clicks/actions.

import { ExternalLink, Mail, MessageSquare, Phone, QrCode } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  BusinessCard,
  BusinessCardLink,
  BusinessCardSection,
  SlideshowSlide,
  StepItem,
} from "@/lib/business-cards/types";

export type PreviewAction = "call" | "sms" | "email" | "map" | "lead" | "website" | "video";

function hexAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function CardPreview({
  card,
  publicUrl,
  onLink,
  onAction,
}: {
  card: BusinessCard;
  publicUrl: string;
  onLink?: (link: BusinessCardLink) => void;
  onAction?: (action: PreviewAction) => void;
}) {
  const bg = card.backgroundColor || "#001138";
  const accent = card.accentColor || "#C9A96E";
  const text = card.textColor || "#F4F1EA";
  const surface = hexAlpha(text, 0.06);
  const border = hexAlpha(text, 0.12);

  const media = card.mediaSettings || {};
  const shapeClass =
    media.profile_shape === "square" ? "rounded-md" : media.profile_shape === "rounded" ? "rounded-2xl" : "rounded-full";
  const alignClass = media.content_align === "left" ? "items-start text-left" : "items-center text-center";
  const useBgImage = Boolean(media.use_background_image && card.backgroundImageUrl);

  const name = card.displayName || [card.firstName, card.lastName].filter(Boolean).join(" ") || "Your Name";
  const subtitle = [card.jobTitle, card.companyName].filter(Boolean).join(" · ");
  const links = (card.links ?? []).filter((l) => l.isVisible).sort((a, b) => a.displayOrder - b.displayOrder);

  const ordered = [...(card.sections ?? [])]
    .filter((s) => s.isVisible && s.sectionType !== "opener")
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const pill = (label: string, icon: React.ReactNode, onClick?: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-3 text-xs font-medium transition active:scale-95"
      style={{ background: surface, border: `1px solid ${border}`, color: accent }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const linkRow = (label: string, onClick?: () => void, key?: string) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99]"
      style={{ background: surface, border: `1px solid ${border}`, color: text }}
    >
      <span>{label}</span>
      <ExternalLink className="h-4 w-4 opacity-60" />
    </button>
  );

  function renderSection(s: BusinessCardSection) {
    const wrap = (node: React.ReactNode) => (
      <div
        key={s.id}
        style={{ marginTop: s.marginTop, marginBottom: s.marginBottom, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom }}
      >
        {node}
      </div>
    );

    switch (s.sectionType) {
      case "profile_header":
        return wrap(
          <div className={cn("flex flex-col", alignClass)}>
            {card.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.logoUrl} alt="" className="mb-3 h-6 object-contain" />
            ) : (
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: hexAlpha(text, 0.5) }}>
                {card.companyName || "Digital Card"}
              </div>
            )}
            {card.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.profilePhotoUrl}
                alt={name}
                className={cn("h-24 w-24 object-cover", shapeClass)}
                style={{ border: media.profile_outline ? `2px solid ${accent}` : `2px solid ${border}` }}
              />
            ) : (
              <div
                className={cn("grid h-24 w-24 place-items-center text-2xl font-semibold", shapeClass)}
                style={{ background: surface, color: accent, border: `2px solid ${border}` }}
              >
                {name.slice(0, 1)}
              </div>
            )}
            <div className="mt-3 text-lg font-semibold" style={{ color: text }}>
              {name}
            </div>
            {subtitle ? (
              <div className="mt-0.5 text-xs font-medium" style={{ color: hexAlpha(text, 0.7) }}>
                {subtitle}
              </div>
            ) : null}
            {card.bio ? (
              <p className="mt-2 text-xs leading-5" style={{ color: hexAlpha(text, 0.7) }}>
                {card.bio}
              </p>
            ) : null}
          </div>,
        );
      case "quick_actions": {
        const actions: React.ReactNode[] = [];
        if (card.primaryPhone) actions.push(pill("Call", <Phone className="h-4 w-4" />, () => onAction?.("call")));
        if (card.smsPhone || card.primaryPhone) actions.push(pill("SMS", <MessageSquare className="h-4 w-4" />, () => onAction?.("sms")));
        if (card.primaryEmail) actions.push(pill("Email", <Mail className="h-4 w-4" />, () => onAction?.("email")));
        if (!actions.length) return null;
        return wrap(<div className="flex gap-2">{actions}</div>);
      }
      case "links": {
        const rows: React.ReactNode[] = [];
        if (card.websiteUrl) rows.push(linkRow("Website", () => onAction?.("website"), "website"));
        for (const l of links) rows.push(linkRow(l.label || "Link", () => onLink?.(l), l.id));
        if (!rows.length) return null;
        return wrap(<div className="flex flex-col gap-2">{rows}</div>);
      }
      case "lead_capture": {
        if (!card.leadFormSettings?.enabled) return null;
        return wrap(
          <button
            type="button"
            onClick={() => onAction?.("lead")}
            className="w-full rounded-xl py-3 text-sm font-semibold transition active:scale-[0.99]"
            style={{ background: accent, color: bg }}
          >
            {card.leadFormSettings?.button_label || "Send me your info"}
          </button>,
        );
      }
      case "video": {
        if (!card.introVideoUrl) return null;
        return wrap(linkRow("Watch intro video", () => onAction?.("video")));
      }
      case "qr_code":
        return wrap(
          <div className="flex justify-center">
            <div className="rounded-xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/cards/qr?url=${encodeURIComponent(publicUrl)}&size=320&fg=${encodeURIComponent(card.backgroundColor || "#001138")}`}
                alt="QR code"
                className="h-36 w-36"
              />
            </div>
          </div>,
        );
      case "slideshow": {
        const slides = (Array.isArray(s.content?.slides) ? s.content.slides : []) as SlideshowSlide[];
        if (!slides.length) return null;
        return wrap(
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {slides.map((sl) => (
              <div key={sl.id} className="relative w-full shrink-0 snap-center overflow-hidden rounded-xl" style={{ border: `1px solid ${border}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sl.image_url} alt={sl.caption || ""} className="h-44 w-full object-cover" />
                {sl.caption ? (
                  <div className="absolute inset-x-0 bottom-0 px-3 py-1.5 text-xs font-medium" style={{ background: hexAlpha(bg, 0.7), color: text }}>
                    {sl.caption}
                  </div>
                ) : null}
              </div>
            ))}
          </div>,
        );
      }
      case "steps": {
        const steps = (Array.isArray(s.content?.steps) ? s.content.steps : []) as StepItem[];
        if (!steps.length) return null;
        return wrap(
          <div className="flex flex-col gap-2">
            {steps.map((st, i) => (
              <div key={st.id} className="flex gap-3 rounded-xl px-3 py-2.5" style={{ background: surface, border: `1px solid ${border}` }}>
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ background: accent, color: bg }}>
                  {i + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: text }}>
                    {st.title}
                  </div>
                  {st.description ? <div className="text-xs" style={{ color: hexAlpha(text, 0.7) }}>{st.description}</div> : null}
                </div>
              </div>
            ))}
          </div>,
        );
      }
      case "nfc":
        return wrap(
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: surface, border: `1px solid ${border}`, color: hexAlpha(text, 0.6) }}>
            <div className="flex items-center gap-1.5 font-semibold" style={{ color: text }}>
              <QrCode className="h-3.5 w-3.5" />
              NFC tap to share
            </div>
            NFC tap-to-share uses this public URL once a physical product is linked.
          </div>,
        );
      default:
        return null;
    }
  }

  return (
    <div
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[26px] p-5"
      style={{
        background: bg,
        color: text,
        border: `1px solid ${border}`,
        ...(useBgImage
          ? {
              backgroundImage: `linear-gradient(${hexAlpha(bg, 0.82)}, ${hexAlpha(bg, 0.92)}), url(${card.backgroundImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      {ordered.map(renderSection)}
      <div className="mt-4 text-center text-[10px]" style={{ color: hexAlpha(text, 0.4) }}>
        Powered by Arizona Christian Tuition
      </div>
    </div>
  );
}
