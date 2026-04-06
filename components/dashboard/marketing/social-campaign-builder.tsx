"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, ImageIcon, Save, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MOCK_CAMPAIGNS, type Campaign } from "@/lib/campaigns";
import {
  type SocialNetwork,
  presetsForNetwork,
  getSocialPreset,
} from "@/lib/marketing/social-creative-sizes";
import { cn } from "@/lib/utils";

const SOCIAL_DRAFT_KEY = "act-social-campaign-draft-v1";

type BgMode = "solid" | "gradient" | "image";

type SocialDraft = {
  network: SocialNetwork;
  formatId: string;
  headline: string;
  subline: string;
  body: string;
  hashtags: string;
  ctaLabel: string;
  imageUrl: string;
  bgMode: BgMode;
  bgColor: string;
  bgColorEnd: string;
  bgImageUrl: string;
  bgOverlay: number;
  showSafeZones: boolean;
};

function defaultSocialDraft(): SocialDraft {
  return {
    network: "facebook",
    formatId: "fb-feed-square",
    headline: "Support Arizona students",
    subline: "Tax-credit eligible giving",
    body: "Your gift helps families choose Christ-centered education.",
    hashtags: "#ArizonaTuition #SchoolChoice #ACTSTO",
    ctaLabel: "Give today",
    imageUrl: "",
    bgMode: "gradient",
    bgColor: "#1e3a5f",
    bgColorEnd: "#4a7ab8",
    bgImageUrl: "",
    bgOverlay: 0.4,
    showSafeZones: true,
  };
}

function readImageFileAsDataUrl(file: File | null, onDone: (dataUrl: string) => void) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => onDone(String(reader.result ?? ""));
  reader.readAsDataURL(file);
}

function creativeBackgroundStyle(
  mode: BgMode,
  color: string,
  colorEnd: string,
  imageUrl: string,
  overlay: number
): React.CSSProperties {
  if (mode === "gradient") {
    return { background: `linear-gradient(160deg, ${color} 0%, ${colorEnd || color} 100%)` };
  }
  if (mode === "image" && imageUrl.trim()) {
    const a = Math.min(0.75, Math.max(0, overlay));
    return {
      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,${a}), rgba(0,0,0,${a * 0.9})), url(${imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { backgroundColor: color };
}

function SocialCreativeCanvas({
  draft,
  preset,
  large,
}: {
  draft: SocialDraft;
  preset: NonNullable<ReturnType<typeof getSocialPreset>>;
  large?: boolean;
}) {
  const ar = `${preset.widthPx} / ${preset.heightPx}`;

  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden rounded-lg border-2 border-border shadow-lg",
        large ? "max-w-md" : "max-w-[280px]"
      )}
      style={{ aspectRatio: ar }}
    >
      {draft.showSafeZones && preset.isVerticalStory ? (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 border-b-2 border-dashed border-amber-400/70 bg-amber-400/5"
            style={{ height: "14%" }}
            title="Top UI safe margin"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t-2 border-dashed border-amber-400/70 bg-amber-400/5"
            style={{ height: "22%" }}
            title="Bottom UI / caption safe margin"
          />
        </>
      ) : null}

      <div
        className="flex size-full min-h-0 flex-col text-white"
        style={creativeBackgroundStyle(
          draft.bgMode,
          draft.bgColor,
          draft.bgColorEnd,
          draft.bgImageUrl,
          draft.bgOverlay
        )}
      >
        {draft.imageUrl ? (
          <div
            className={cn(
              "relative w-full shrink-0 overflow-hidden",
              preset.heightPx > preset.widthPx * 1.2 ? "h-[48%]" : "h-[42%]"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.imageUrl} alt="" className="size-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
          </div>
        ) : (
          <div
            className={cn(
              "flex w-full shrink-0 items-center justify-center bg-black/20",
              preset.heightPx > preset.widthPx * 1.2 ? "h-[38%]" : "h-[32%]"
            )}
          >
            <ImageIcon className={cn("opacity-50", large ? "size-14" : "size-10")} />
          </div>
        )}

        <div className={cn("flex min-h-0 flex-1 flex-col px-[5%] pb-[5%] pt-2", large ? "gap-1.5" : "gap-1")}>
          <h3
            className={cn(
              "font-heading font-bold leading-tight drop-shadow-md",
              large ? "text-lg sm:text-xl" : "text-[clamp(0.55rem,3.2vw,0.85rem)]"
            )}
          >
            {draft.headline}
          </h3>
          <p
            className={cn(
              "font-medium opacity-95 drop-shadow",
              large ? "text-sm" : "text-[clamp(0.5rem,2.6vw,0.7rem)]"
            )}
          >
            {draft.subline}
          </p>
          <p
            className={cn(
              "mt-1 line-clamp-4 opacity-90 drop-shadow",
              large ? "text-xs leading-relaxed" : "text-[clamp(0.45rem,2.2vw,0.62rem)] leading-snug"
            )}
          >
            {draft.body}
          </p>
          <p
            className={cn(
              "mt-auto line-clamp-2 font-mono opacity-80",
              large ? "text-[0.65rem]" : "text-[0.45rem]"
            )}
          >
            {draft.hashtags}
          </p>
          {draft.ctaLabel.trim() ? (
            <div className="mt-2 shrink-0">
              <span
                className={cn(
                  "inline-block rounded-full bg-white/95 px-3 py-1 font-semibold text-primary shadow-md",
                  large ? "text-xs" : "text-[0.5rem]"
                )}
              >
                {draft.ctaLabel}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SocialCampaignBuilder({ variant }: { variant: "admin" | "parent" }) {
  const [draft, setDraft] = useState<SocialDraft>(defaultSocialDraft);
  const [campaignSlug, setCampaignSlug] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const preset = getSocialPreset(draft.formatId) ?? presetsForNetwork(draft.network)[0]!;
  const networkPresets = useMemo(() => presetsForNetwork(draft.network), [draft.network]);

  const applyCampaign = useCallback((c: Campaign) => {
    setDraft((d) => ({
      ...d,
      headline: c.title,
      subline: c.tagline,
      body: c.excerpt.slice(0, 220),
      imageUrl: c.image || c.students[0]?.photo || d.imageUrl,
      hashtags: `#${c.slug.replace(/-/g, "")} #ArizonaTuition #ChristianEducation`,
    }));
  }, []);

  useEffect(() => {
    if (!campaignSlug) return;
    const c = MOCK_CAMPAIGNS.find((x) => x.slug === campaignSlug);
    if (c) applyCampaign(c);
  }, [campaignSlug, applyCampaign]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOCIAL_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SocialDraft>;
      if (!parsed || typeof parsed !== "object") return;
      const base = defaultSocialDraft();
      const network = (parsed.network === "instagram" ? "instagram" : "facebook") as SocialNetwork;
      let formatId = typeof parsed.formatId === "string" ? parsed.formatId : base.formatId;
      const preset = getSocialPreset(formatId);
      if (!preset || preset.network !== network) {
        formatId = presetsForNetwork(network)[0]?.id ?? base.formatId;
      }
      setDraft({ ...base, ...parsed, network, formatId });
    } catch {
      /* ignore */
    }
  }, []);

  function persist(next: SocialDraft) {
    setDraft(next);
    try {
      localStorage.setItem(SOCIAL_DRAFT_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }

  function setNetwork(network: SocialNetwork) {
    const list = presetsForNetwork(network);
    const first = list[0];
    if (!first) return;
    persist({ ...draft, network, formatId: first.id });
  }

  function saveDraft() {
    persist(draft);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  const portal = variant === "admin" ? "Super Admin" : "Parent portal";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="outline" className="font-mono text-[10px] uppercase">
            ACTSTO.org · {portal}
          </Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            Build feed and story creatives at platform-recommended pixel sizes. Export and scheduling wire to Meta / your CMS
            next.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={saveDraft}>
            <Save className="size-4" />
            {savedFlash ? "Saved" : "Save draft"}
          </Button>
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setPreviewOpen(true)}>
            <Eye className="size-4" />
            Preview
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-1 sm:inline-flex">
        {(
          [
            { id: "facebook" as const, label: "Facebook" },
            { id: "instagram" as const, label: "Instagram" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setNetwork(t.id)}
            className={cn(
              "rounded-lg px-5 py-2.5 text-sm font-medium transition-colors",
              draft.network === t.id
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg text-primary">
                <Sparkles className="size-5" />
                Campaign source
              </CardTitle>
              <CardDescription>Optional: pull copy and hero image from a mock campaign.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label>Link campaign</Label>
              <Select
                value={campaignSlug || "__none__"}
                onValueChange={(v) => setCampaignSlug(!v || v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select campaign…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {MOCK_CAMPAIGNS.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Format (pixels)</CardTitle>
              <CardDescription>
                Canvas matches export dimensions for{" "}
                <span className="font-medium text-foreground">
                  {draft.network === "facebook" ? "Facebook" : "Instagram"}
                </span>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="soc-format">Placement &amp; size</Label>
                <Select
                  value={draft.formatId}
                  onValueChange={(v) => {
                    if (typeof v === "string" && v) persist({ ...draft, formatId: v });
                  }}
                >
                  <SelectTrigger id="soc-format" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {networkPresets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label} — {p.widthPx}×{p.heightPx}px
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">{preset.hint}</p>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="soc-safe"
                  checked={draft.showSafeZones}
                  onCheckedChange={(c) => persist({ ...draft, showSafeZones: c === true })}
                />
                <div>
                  <Label htmlFor="soc-safe" className="cursor-pointer font-medium">
                    Show story / Reels safe margins
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Highlights approximate top and bottom zones where app UI overlaps (9:16 formats only).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Copy</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="soc-head">Headline</Label>
                <Input
                  id="soc-head"
                  className="mt-1.5"
                  value={draft.headline}
                  onChange={(e) => persist({ ...draft, headline: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="soc-sub">Subline</Label>
                <Input
                  id="soc-sub"
                  className="mt-1.5"
                  value={draft.subline}
                  onChange={(e) => persist({ ...draft, subline: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="soc-body">Body</Label>
                <Textarea
                  id="soc-body"
                  className="mt-1.5 min-h-[88px]"
                  value={draft.body}
                  onChange={(e) => persist({ ...draft, body: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="soc-tags">Hashtags / handles</Label>
                <Input
                  id="soc-tags"
                  className="mt-1.5 font-mono text-sm"
                  value={draft.hashtags}
                  onChange={(e) => persist({ ...draft, hashtags: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="soc-cta">CTA pill text</Label>
                <Input
                  id="soc-cta"
                  className="mt-1.5"
                  value={draft.ctaLabel}
                  onChange={(e) => persist({ ...draft, ctaLabel: e.target.value })}
                  placeholder="e.g. Donate · Learn more"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Visuals</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="soc-img">Hero image URL</Label>
                <Input
                  id="soc-img"
                  className="mt-1.5 font-mono text-sm"
                  value={draft.imageUrl}
                  onChange={(e) => persist({ ...draft, imageUrl: e.target.value })}
                />
                <Input
                  type="file"
                  accept="image/*"
                  className="mt-2 cursor-pointer"
                  onChange={(e) =>
                    readImageFileAsDataUrl(e.target.files?.[0] ?? null, (url) =>
                      persist({ ...draft, imageUrl: url })
                    )
                  }
                />
              </div>
              <div>
                <Label>Background</Label>
                <Select
                  value={draft.bgMode}
                  onValueChange={(v) => persist({ ...draft, bgMode: v as BgMode })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="soc-c1">Color A</Label>
                  <Input
                    id="soc-c1"
                    type="color"
                    className="mt-1.5 h-10 w-full cursor-pointer"
                    value={draft.bgColor}
                    onChange={(e) => persist({ ...draft, bgColor: e.target.value })}
                  />
                </div>
                {draft.bgMode === "gradient" ? (
                  <div className="flex-1">
                    <Label htmlFor="soc-c2">Color B</Label>
                    <Input
                      id="soc-c2"
                      type="color"
                      className="mt-1.5 h-10 w-full cursor-pointer"
                      value={draft.bgColorEnd}
                      onChange={(e) => persist({ ...draft, bgColorEnd: e.target.value })}
                    />
                  </div>
                ) : null}
              </div>
              {draft.bgMode === "image" ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="soc-bgurl">Background image URL</Label>
                  <Input
                    id="soc-bgurl"
                    className="font-mono text-sm"
                    value={draft.bgImageUrl}
                    onChange={(e) => persist({ ...draft, bgImageUrl: e.target.value })}
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    className="cursor-pointer"
                    onChange={(e) =>
                      readImageFileAsDataUrl(e.target.files?.[0] ?? null, (url) =>
                        persist({ ...draft, bgImageUrl: url, bgMode: "image" })
                      )
                    }
                  />
                  <div>
                    <Label>Overlay strength ({Math.round(draft.bgOverlay * 100)}%)</Label>
                    <input
                      type="range"
                      min={0}
                      max={0.7}
                      step={0.05}
                      value={draft.bgOverlay}
                      className="mt-2 w-full max-w-md accent-primary"
                      onChange={(e) => persist({ ...draft, bgOverlay: Number.parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled>
              <Download className="mr-1.5 size-4" />
              Export {preset.widthPx}×{preset.heightPx}px PNG (wire)
            </Button>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">Live preview</CardTitle>
              <CardDescription>
                Aspect ratio = {preset.widthPx}∶{preset.heightPx}px ({preset.label})
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <SocialCreativeCanvas draft={draft} preset={preset} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>Social creative — {preset.widthPx}×{preset.heightPx}px</DialogTitle>
            <DialogDescription>
              {draft.network === "facebook" ? "Facebook" : "Instagram"} · {preset.label}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <SocialCreativeCanvas draft={draft} preset={preset} large />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Final export should match these pixel dimensions for best quality on platform.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
