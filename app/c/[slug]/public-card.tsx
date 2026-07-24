"use client";

import * as React from "react";
import { Copy, Heart, Moon, Share2, Sun, UserPlus, X } from "lucide-react";

import { CardPreview } from "@/components/business-card/card-preview";
import type { BusinessCard, BusinessCardLink, EventType, LeadFormField } from "@/lib/business-cards/types";

export function PublicCard({ card, publicUrl }: { card: BusinessCard; publicUrl: string }) {
  const opener = (card.sections ?? []).find((s) => s.sectionType === "opener" && s.isVisible);
  const [showSplash, setShowSplash] = React.useState(Boolean(opener));
  const [light, setLight] = React.useState(false);
  const [leadOpen, setLeadOpen] = React.useState(false);
  const [liked, setLiked] = React.useState(false);

  const canToggle = card.themeMode === "both";
  const effectiveCard: BusinessCard = light
    ? { ...card, backgroundColor: "#F4F1EA", textColor: "#141414" }
    : card;

  const track = React.useCallback(
    (eventType: EventType, linkId?: string) => {
      const body = JSON.stringify({ cardId: card.id, eventType, linkId });
      const sent = navigator.sendBeacon?.("/api/cards/events", new Blob([body], { type: "application/json" }));
      if (!sent) {
        fetch("/api/cards/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    },
    [card.id],
  );

  function handleAction(action: "call" | "sms" | "email" | "map" | "lead" | "website" | "video") {
    switch (action) {
      case "call":
        if (card.primaryPhone) {
          track("link_click");
          window.location.href = `tel:${card.primaryPhone}`;
        }
        break;
      case "sms": {
        const n = card.smsPhone || card.primaryPhone;
        if (n) {
          track("link_click");
          window.location.href = `sms:${n}`;
        }
        break;
      }
      case "email":
        if (card.primaryEmail) {
          track("link_click");
          window.location.href = `mailto:${card.primaryEmail}`;
        }
        break;
      case "map":
        if (card.mapsUrl) {
          track("link_click");
          window.open(card.mapsUrl, "_blank");
        }
        break;
      case "website":
        if (card.websiteUrl) {
          track("link_click");
          window.open(card.websiteUrl, "_blank");
        }
        break;
      case "video":
        if (card.introVideoUrl) {
          track("link_click");
          window.open(card.introVideoUrl, "_blank");
        }
        break;
      case "lead":
        setLeadOpen(true);
        break;
    }
  }

  function handleLink(link: BusinessCardLink) {
    track("link_click", link.id);
    if (link.url) window.open(link.url, link.openInNewTab ? "_blank" : "_self");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      track("copy_link");
    } catch {
      /* ignore */
    }
  }
  async function share() {
    track("share");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Digital business card", url: publicUrl });
      } catch {
        /* cancelled */
      }
    } else {
      void copyLink();
    }
  }
  function save() {
    track("save_contact");
    window.location.href = `/api/cards/vcf?slug=${encodeURIComponent(card.slug)}`;
  }
  function like() {
    if (!liked) {
      setLiked(true);
      track("like");
    }
  }

  return (
    <div className="min-h-screen w-full px-4 py-8" style={{ background: effectiveCard.backgroundColor }}>
      {showSplash && opener ? (
        <Splash content={(opener.content || {}) as Record<string, unknown>} card={card} onView={() => setShowSplash(false)} />
      ) : null}

      <div className="mx-auto max-w-sm">
        {canToggle ? (
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => setLight((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-full"
              style={{ background: "rgba(127,127,127,0.15)", color: effectiveCard.textColor }}
              aria-label="Toggle theme"
            >
              {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        ) : null}

        <CardPreview card={effectiveCard} publicUrl={publicUrl} onAction={handleAction} onLink={handleLink} />

        <div className="mt-5 flex items-center justify-center gap-2">
          <FabBtn icon={<Copy className="h-4 w-4" />} label="Copy" onClick={copyLink} accent={card.accentColor} />
          <FabBtn icon={<Share2 className="h-4 w-4" />} label="Share" onClick={share} accent={card.accentColor} />
          <FabBtn icon={<UserPlus className="h-4 w-4" />} label="Save" onClick={save} accent={card.accentColor} />
          <FabBtn
            icon={<Heart className={liked ? "h-4 w-4 fill-current" : "h-4 w-4"} />}
            label="Like"
            onClick={like}
            accent={card.accentColor}
          />
        </div>
      </div>

      {leadOpen ? <LeadModal card={card} onClose={() => setLeadOpen(false)} onSubmitted={() => track("lead_submit")} /> : null}
    </div>
  );
}

function FabBtn({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent: string }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium"
      style={{ background: "rgba(127,127,127,0.15)", color: accent }}
    >
      {icon}
      {label}
    </button>
  );
}

function Splash({ content, card, onView }: { content: Record<string, unknown>; card: BusinessCard; onView: () => void }) {
  const accent = card.accentColor;
  const duration = Number(content.duration_seconds || 0);
  const [shown, setShown] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const close = React.useCallback(() => {
    setLeaving(true);
    window.setTimeout(onView, 400);
  }, [onView]);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (duration > 0) timer = setTimeout(close, duration * 1000);
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [duration, close]);

  const eyebrow = (content.eyebrow as string) || "Digital Card";
  const title = (content.title as string) || card.displayName || "Welcome";
  const subtitle = (content.subtitle as string) || "Tap to view my digital business card.";
  const primary = (content.primary_label as string) || "View card";
  const secondary = (content.secondary_label as string) || (card.primaryPhone ? "Call me" : "");
  const logo = (content.logo_url as string) || card.logoUrl || "";

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6 text-center transition-opacity duration-[400ms] ease-out"
      style={{ background: card.backgroundColor, color: card.textColor, opacity: shown && !leaving ? 1 : 0 }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="mb-5 h-20 w-20 rounded-full object-cover" style={{ border: `2px solid ${accent}` }} />
      ) : null}
      <div className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ opacity: 0.6 }}>
        {eyebrow}
      </div>
      <h1 className="mt-3 text-5xl font-bold">{title}</h1>
      <p className="mt-2 text-sm" style={{ opacity: 0.7 }}>
        {subtitle}
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={close} className="rounded-full px-6 py-2.5 text-sm font-semibold" style={{ background: "rgba(127,127,127,0.18)", color: accent }}>
          {primary}
        </button>
        {secondary && card.primaryPhone ? (
          <a href={`tel:${card.primaryPhone}`} className="rounded-full px-6 py-2.5 text-sm font-semibold" style={{ background: "rgba(127,127,127,0.18)", color: accent }}>
            {secondary}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function LeadModal({ card, onClose, onSubmitted }: { card: BusinessCard; onClose: () => void; onSubmitted: () => void }) {
  const settings = card.leadFormSettings;
  const fields = (settings?.fields ?? []).filter((f) => f.enabled);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/cards/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId: card.id, ...values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not submit.");
      setDone(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-5"
        style={{ background: card.backgroundColor, color: card.textColor, border: "1px solid rgba(127,127,127,0.25)" }}
      >
        <button onClick={onClose} className="absolute right-3 top-3 opacity-60 hover:opacity-100" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        {done ? (
          <div className="py-8 text-center">
            <div className="text-lg font-semibold">Thank you!</div>
            <p className="mt-1 text-sm" style={{ opacity: 0.7 }}>
              Your info was sent. {card.displayName || "We"} will follow up shortly.
            </p>
            <button
              onClick={onClose}
              className="mt-5 rounded-full px-6 py-2 text-sm font-semibold"
              style={{ background: card.accentColor, color: card.backgroundColor }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="text-lg font-semibold">{settings?.title || "Send me your info"}</div>
            {settings?.description ? (
              <p className="mt-1 text-sm" style={{ opacity: 0.7 }}>
                {settings.description}
              </p>
            ) : null}
            <div className="mt-4 space-y-2.5">
              {fields.map((f: LeadFormField) =>
                f.key === "message" ? (
                  <textarea
                    key={f.key}
                    placeholder={f.label + (f.required ? " *" : "")}
                    value={values[f.key] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    rows={3}
                    className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "rgba(127,127,127,0.12)", color: card.textColor, border: "1px solid rgba(127,127,127,0.2)" }}
                  />
                ) : (
                  <input
                    key={f.key}
                    placeholder={f.label + (f.required ? " *" : "")}
                    type={f.key === "email" ? "email" : f.key === "phone" ? "tel" : "text"}
                    value={values[f.key] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "rgba(127,127,127,0.12)", color: card.textColor, border: "1px solid rgba(127,127,127,0.2)" }}
                  />
                ),
              )}
            </div>
            {error ? <div className="mt-2 text-xs text-red-400">{error}</div> : null}
            <button
              onClick={submit}
              disabled={submitting}
              className="mt-4 w-full rounded-full py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: card.accentColor, color: card.backgroundColor }}
            >
              {submitting ? "Sending…" : settings?.submit_label || "Send info"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
