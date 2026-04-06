"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  FileUp,
  ImageIcon,
  Mail,
  Package,
  Printer,
  Save,
  Trash2,
} from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
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
  POSTCARD_SIZE_OPTIONS,
  type PostcardSizeId,
  getPostcardSize,
} from "@/lib/marketing/postcard-sizes";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "act-postcard-draft-v1";
const TEMPLATES_KEY = "act-postcard-templates-v1";

export type RecipientRow = {
  id: string;
  name: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
};

type BgMode = "solid" | "gradient" | "image";

/** Clip / mask for the featured photo on the postcard front */
export type FeaturedPhotoMask = "rectangle" | "rounded" | "circle" | "arch" | "hex";

type DraftShape = {
  sizeId: PostcardSizeId;
  title: string;
  subtitle: string;
  tagline: string;
  notes: string;
  photoUrl: string;
  /** How the featured image is masked (shape) */
  photoMask: FeaturedPhotoMask;
  bgMode: BgMode;
  bgColor: string;
  bgColorEnd: string;
  bgImageUrl: string;
  /** Darken background image for text contrast (0–1) */
  bgImageOverlay: number;
  qrTargetUrl: string;
  returnName: string;
  returnLine1: string;
  returnCity: string;
  returnState: string;
  returnZip: string;
  backMessage: string;
  /** Mailing side panel background */
  backPanelColor: string;
  /** Decorative / branding image — shown only in the bottom band (not in postage or address blocks) */
  backBrandImageUrl: string;
  deployDigital: boolean;
  deployPrint: boolean;
  recipients: RecipientRow[];
};

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const defaultDraft = (): DraftShape => ({
  sizeId: "4.25x5.5",
  title: "Fund Christian education in Arizona",
  subtitle: "Tax-credit eligible giving",
  tagline: "Every gift helps a student thrive.",
  notes: "Scan to give or learn more — thank you for supporting our campaign.",
  photoUrl: "",
  photoMask: "rounded",
  bgMode: "gradient",
  bgColor: "#1e3a5f",
  bgColorEnd: "#3d6fa8",
  bgImageUrl: "",
  bgImageOverlay: 0.45,
  qrTargetUrl: "https://arizonachristiantuition.com/campaigns",
  returnName: "Arizona Christian Tuition",
  returnLine1: "P.O. Box 0000",
  returnCity: "Phoenix",
  returnState: "AZ",
  returnZip: "85001",
  backMessage: "Learn more at actsto.org — Arizona School Tuition Organization.",
  backPanelColor: "#f7f5f0",
  backBrandImageUrl: "",
  deployDigital: true,
  deployPrint: false,
  recipients: [
    {
      id: newId(),
      name: "Jordan Example",
      line1: "123 W Sample St",
      city: "Mesa",
      state: "AZ",
      zip: "85201",
    },
  ],
});

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace(/^#/, "");
  if (h.length === 6) {
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  if (h.length === 3) {
    const a = h[0]!;
    const b = h[1]!;
    const c = h[2]!;
    return {
      r: parseInt(a + a, 16),
      g: parseInt(b + b, 16),
      b: parseInt(c + c, 16),
    };
  }
  return null;
}

function foregroundForBackground(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#1a1a1a";
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.55 ? "#1a1a1a" : "#f4f4f5";
}

function parseCsvRecipients(text: string): RecipientRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: RecipientRow[] = [];
  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 5) continue;
    const [name, line1, city, state, zip] = parts;
    if (!name) continue;
    rows.push({ id: newId(), name, line1: line1 ?? "", city: city ?? "", state: state ?? "", zip: zip ?? "" });
  }
  return rows;
}

function frontBackgroundStyle(
  mode: BgMode,
  color: string,
  colorEnd: string,
  imageUrl: string,
  imageOverlay: number
): React.CSSProperties {
  if (mode === "gradient") {
    return {
      background: `linear-gradient(145deg, ${color} 0%, ${colorEnd || color} 100%)`,
    };
  }
  if (mode === "image" && imageUrl.trim()) {
    const a = Math.min(0.75, Math.max(0, imageOverlay));
    return {
      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,${a}), rgba(0,0,0,${a * 0.85})), url(${imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { backgroundColor: color };
}

function featuredPhotoMaskStyle(mask: FeaturedPhotoMask): React.CSSProperties {
  switch (mask) {
    case "hex":
      return {
        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      };
    case "arch":
      return {
        borderTopLeftRadius: "50% 40%",
        borderTopRightRadius: "50% 40%",
        borderBottomLeftRadius: "0.5rem",
        borderBottomRightRadius: "0.5rem",
      };
    case "circle":
      return { borderRadius: "50%" };
    case "rounded":
      return { borderRadius: "1rem" };
    default:
      return { borderRadius: "0.125rem" };
  }
}

function FeaturedPhotoFrame({
  photoUrl,
  mask,
  compact,
}: {
  photoUrl: string;
  mask: FeaturedPhotoMask;
  /** Slightly smaller placeholder icon in the sticky column */
  compact?: boolean;
}) {
  const clip = featuredPhotoMaskStyle(mask);
  const isCircle = mask === "circle";

  if (!photoUrl) {
    return (
      <div
        className={cn(
          "mb-2 flex w-full items-center justify-center bg-black/25",
          isCircle ? "aspect-square max-w-[75%] self-center rounded-full" : "aspect-video rounded-sm"
        )}
      >
        <ImageIcon className={cn("opacity-60", compact ? "size-10" : "size-12")} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-2 w-full overflow-hidden bg-black/20",
        isCircle ? "aspect-square max-w-[78%] self-center" : "aspect-video"
      )}
      style={clip}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl} alt="" className="size-full object-cover" />
    </div>
  );
}

/** Fixed square box so flex layout cannot squash the QR (percentage widths on `img` were collapsing height). */
function PostcardQrImage({ src, size = "default" }: { src: string; size?: "default" | "large" }) {
  return (
    <div
      className={cn(
        "aspect-square shrink-0 rounded-md bg-white p-1 shadow-sm ring-1 ring-black/10",
        size === "large" ? "w-24 sm:w-28" : "w-14 sm:w-16"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={160} height={160} className="size-full object-contain" />
    </div>
  );
}

/**
 * Back layout: postage top-right and address blocks unchanged.
 * Branding image + message only in the bottom band, with a narrow reserved strip (no art) for USPS automation.
 */
function PostcardBackInner({
  draft,
  sampleRecipient,
  large,
}: {
  draft: DraftShape;
  sampleRecipient: RecipientRow | undefined;
  large?: boolean;
}) {
  const panel = draft.backPanelColor || "#f7f5f0";
  const fg = foregroundForBackground(panel);
  const subtle = fg === "#f4f4f5" ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.55)";
  const borderSubtle = fg === "#f4f4f5" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.2)";

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col p-[5%]", large ? "text-xs sm:text-sm" : "text-[10px] sm:text-[11px]")}
      style={{ backgroundColor: panel, color: fg }}
    >
      <div className="flex shrink-0 justify-between gap-2">
        <div className={cn("max-w-[42%] leading-tight", large ? "text-[0.85em]" : "text-[0.65em]")}>
          <p className="font-semibold">Return</p>
          <p>{draft.returnName}</p>
          <p>{draft.returnLine1}</p>
          <p>
            {draft.returnCity}, {draft.returnState} {draft.returnZip}
          </p>
        </div>
        <div
          className={cn(
            "flex shrink-0 flex-col items-center justify-center rounded border-2 border-dashed border-neutral-400 bg-white text-neutral-600",
            large ? "h-20 w-28 text-xs" : "h-16 w-24 text-[0.6em]"
          )}
        >
          <Mail className={cn("opacity-60", large ? "mb-1 size-5" : "mb-0.5 size-4")} />
          POSTAGE
        </div>
      </div>

      <div className="mt-auto flex min-h-0 flex-1 flex-col justify-center py-[8%]">
        <div
          className={cn(
            "mx-auto rounded border border-dashed border-neutral-400/60 bg-white/95 p-3 text-foreground shadow-sm",
            large ? "w-[75%] p-4" : "min-h-[32%] w-[72%]"
          )}
        >
          {sampleRecipient ? (
            <>
              <p className={cn("font-semibold", large ? "text-base" : "text-[1.05em]")}>{sampleRecipient.name}</p>
              <p className="mt-1">{sampleRecipient.line1}</p>
              <p className="mt-2">
                {sampleRecipient.city}, {sampleRecipient.state} {sampleRecipient.zip}
              </p>
            </>
          ) : (
            <p style={{ color: subtle }}>{large ? "No recipients" : "Add recipients to preview address block"}</p>
          )}
        </div>
      </div>

      <div className="mt-auto shrink-0 border-t pt-2" style={{ borderColor: borderSubtle }}>
        <div className="flex gap-1.5">
          <div className="relative min-h-[2.75rem] min-w-0 flex-1 overflow-hidden rounded-sm">
            {draft.backBrandImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.backBrandImageUrl}
                  alt=""
                  className="absolute inset-0 size-full object-cover opacity-40"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-black/25 via-black/10 to-transparent"
                  aria-hidden
                />
              </>
            ) : null}
            <p
              className={cn("relative z-10 px-1.5 py-1 leading-snug", large ? "text-xs" : "text-[0.7em]")}
              style={{ color: fg, textShadow: draft.backBrandImageUrl ? "0 1px 2px rgba(0,0,0,0.45)" : undefined }}
            >
              {draft.backMessage}
            </p>
          </div>
          <div
            className={cn(
              "flex shrink-0 flex-col items-center justify-center rounded border border-dashed px-0.5 text-center leading-tight",
              large ? "w-11 text-[0.55rem]" : "w-8 text-[0.45rem]"
            )}
            style={{ borderColor: borderSubtle, color: subtle }}
            title="Leave blank for USPS barcode / sorting imprint when using automation"
          >
            <span className="font-semibold">USPS</span>
            <span>zone</span>
          </div>
        </div>
        <p className="mt-1 text-[0.5em] opacity-70" style={{ color: subtle }}>
          Branding image only in the wide panel — keeps postage (top right) and the narrow USPS strip clear.
        </p>
      </div>
    </div>
  );
}

function PostcardFace({
  sizeId,
  className,
  children,
}: {
  sizeId: PostcardSizeId;
  className?: string;
  children: React.ReactNode;
}) {
  const s = getPostcardSize(sizeId);
  return (
    <div
      className={cn("relative overflow-hidden rounded-md border-2 border-border shadow-md", className)}
      style={{ aspectRatio: `${s.widthIn} / ${s.heightIn}` }}
    >
      {children}
    </div>
  );
}

export function PostcardBuilder({
  channel,
  variant,
}: {
  channel: "digital" | "print";
  variant: "admin" | "parent";
}) {
  const [draft, setDraft] = useState<DraftShape>(defaultDraft);
  const [campaignSlug, setCampaignSlug] = useState<string>("");
  const [manualRecipientLine, setManualRecipientLine] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<{ name: string; data: DraftShape }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TEMPLATES_KEY);
      if (raw) setTemplates(JSON.parse(raw) as { name: string; data: DraftShape }[]);
    } catch {
      /* ignore */
    }
  }, []);

  const applyCampaign = useCallback((c: Campaign) => {
    const photo = c.image || c.students[0]?.photo || "";
    setDraft((d) => ({
      ...d,
      title: c.title,
      tagline: c.tagline,
      subtitle: `${c.school.name} · ${c.students.map((s) => s.firstName).join(", ")}`,
      notes: c.excerpt.slice(0, 280),
      photoUrl: photo,
      qrTargetUrl:
        typeof window !== "undefined"
          ? `${window.location.origin}/campaigns/${c.slug}`
          : `https://arizonachristiantuition.com/campaigns/${c.slug}`,
    }));
  }, []);

  useEffect(() => {
    if (!campaignSlug) return;
    const c = MOCK_CAMPAIGNS.find((x) => x.slug === campaignSlug);
    if (c) applyCampaign(c);
  }, [campaignSlug, applyCampaign]);

  const size = getPostcardSize(draft.sizeId);
  const qrSrc = useMemo(() => {
    const u = draft.qrTargetUrl.trim() || "https://arizonachristiantuition.com";
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(u)}`;
  }, [draft.qrTargetUrl]);

  const sampleRecipient = draft.recipients[0];

  function persistDraft(next: DraftShape) {
    setDraft(next);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }

  function loadDraftFromStorage() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DraftShape;
      if (parsed && typeof parsed === "object") {
        const base = defaultDraft();
        setDraft({
          ...base,
          ...parsed,
          photoMask: (parsed as DraftShape).photoMask ?? base.photoMask,
          bgImageOverlay:
            typeof (parsed as DraftShape).bgImageOverlay === "number"
              ? (parsed as DraftShape).bgImageOverlay
              : base.bgImageOverlay,
          backPanelColor: (parsed as DraftShape).backPanelColor ?? base.backPanelColor,
          backBrandImageUrl: (parsed as DraftShape).backBrandImageUrl ?? base.backBrandImageUrl,
          recipients: parsed.recipients?.length ? parsed.recipients : base.recipients,
        });
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadDraftFromStorage();
  }, []);

  function saveDraft() {
    persistDraft(draft);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function saveTemplate() {
    const name = templateName.trim() || `Template ${templates.length + 1}`;
    const next = [...templates.filter((t) => t.name !== name), { name, data: { ...draft } }];
    setTemplates(next);
    setTemplateName("");
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function applyTemplate(name: string) {
    const t = templates.find((x) => x.name === name);
    if (t) setDraft({ ...t.data, recipients: t.data.recipients?.length ? t.data.recipients : draft.recipients });
  }

  function handleCsvFile(f: File | null) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCsvRecipients(text);
      if (parsed.length) persistDraft({ ...draft, recipients: parsed });
    };
    reader.readAsText(f);
  }

  function addManualRecipient() {
    const p = manualRecipientLine.split("|").map((x) => x.trim());
    if (p.length < 5) return;
    const [name, line1, city, state, zip] = p;
    persistDraft({
      ...draft,
      recipients: [...draft.recipients, { id: newId(), name, line1, city, state, zip }],
    });
    setManualRecipientLine("");
  }

  function readImageFileAsDataUrl(file: File | null, onDone: (dataUrl: string) => void) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onDone(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  const portalLabel = variant === "admin" ? "Super Admin" : "Parent portal";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="outline" className="font-mono text-[10px] uppercase">
            ACTSTO.org · {portalLabel}
          </Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            {channel === "digital"
              ? "Optimize for email, SMS links, and screen — digital sends are free to compose here."
              : "Optimize for print vendors and direct mail — includes mail panel and postage placeholders."}
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

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Campaign data</CardTitle>
              <CardDescription>
                Pull headline, imagery, and QR destination from an active campaign when available.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Link campaign (mock library)</Label>
                <Select
                  value={campaignSlug || "__none__"}
                  onValueChange={(v) => setCampaignSlug(!v || v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select campaign…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None — manual copy</SelectItem>
                    {MOCK_CAMPAIGNS.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Postcard size</CardTitle>
              <CardDescription>Preview aspect ratio updates instantly for front and back.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="pc-size">Size</Label>
              <Select
                value={draft.sizeId}
                onValueChange={(v) => persistDraft({ ...draft, sizeId: v as PostcardSizeId })}
              >
                <SelectTrigger id="pc-size" className="mt-1.5 max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSTCARD_SIZE_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                Selected: {size.label} ({size.widthIn}&Prime; × {size.heightIn}&Prime;) — use print vendor specs for bleed.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Front content</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="pc-title">Title</Label>
                <Input
                  id="pc-title"
                  className="mt-1.5"
                  value={draft.title}
                  onChange={(e) => persistDraft({ ...draft, title: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="pc-sub">Subtitle</Label>
                <Input
                  id="pc-sub"
                  className="mt-1.5"
                  value={draft.subtitle}
                  onChange={(e) => persistDraft({ ...draft, subtitle: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="pc-tag">Tagline</Label>
                <Input
                  id="pc-tag"
                  className="mt-1.5"
                  value={draft.tagline}
                  onChange={(e) => persistDraft({ ...draft, tagline: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="pc-notes">Notes / body</Label>
                <Textarea
                  id="pc-notes"
                  className="mt-1.5 min-h-[80px]"
                  value={draft.notes}
                  onChange={(e) => persistDraft({ ...draft, notes: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="pc-photo">Featured photo URL</Label>
                <Input
                  id="pc-photo"
                  className="mt-1.5 font-mono text-sm"
                  value={draft.photoUrl}
                  onChange={(e) => persistDraft({ ...draft, photoUrl: e.target.value })}
                  placeholder="https://…"
                />
                <div className="mt-2">
                  <Label htmlFor="pc-photo-file" className="text-xs text-muted-foreground">
                    Or upload image (stored in browser as data URL)
                  </Label>
                  <Input
                    id="pc-photo-file"
                    type="file"
                    accept="image/*"
                    className="mt-1.5 cursor-pointer"
                    onChange={(e) =>
                      readImageFileAsDataUrl(e.target.files?.[0] ?? null, (dataUrl) =>
                        persistDraft({ ...draft, photoUrl: dataUrl })
                      )
                    }
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Featured photo shape (mask)</Label>
                <Select
                  value={draft.photoMask}
                  onValueChange={(v) => persistDraft({ ...draft, photoMask: v as FeaturedPhotoMask })}
                >
                  <SelectTrigger className="mt-1.5 max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rectangle">Rectangle (slight radius)</SelectItem>
                    <SelectItem value="rounded">Rounded rectangle</SelectItem>
                    <SelectItem value="circle">Circle</SelectItem>
                    <SelectItem value="arch">Arch / stadium</SelectItem>
                    <SelectItem value="hex">Hexagon</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Circle uses a square crop. Hex and arch use CSS clip-path / radius (export to PDF may vary by engine).
                </p>
              </div>
              <div>
                <Label>Background</Label>
                <Select
                  value={draft.bgMode}
                  onValueChange={(v) => persistDraft({ ...draft, bgMode: v as BgMode })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid color</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="pc-bg1">Color A</Label>
                  <Input
                    id="pc-bg1"
                    type="color"
                    className="mt-1.5 h-10 w-full cursor-pointer"
                    value={draft.bgColor}
                    onChange={(e) => persistDraft({ ...draft, bgColor: e.target.value })}
                  />
                </div>
                {draft.bgMode === "gradient" ? (
                  <div className="flex-1">
                    <Label htmlFor="pc-bg2">Color B</Label>
                    <Input
                      id="pc-bg2"
                      type="color"
                      className="mt-1.5 h-10 w-full cursor-pointer"
                      value={draft.bgColorEnd || draft.bgColor}
                      onChange={(e) => persistDraft({ ...draft, bgColorEnd: e.target.value })}
                    />
                  </div>
                ) : null}
              </div>
              {draft.bgMode === "image" ? (
                <div className="space-y-3 sm:col-span-2">
                  <div>
                    <Label htmlFor="pc-bgimg">Background image URL</Label>
                    <Input
                      id="pc-bgimg"
                      className="mt-1.5 font-mono text-sm"
                      value={draft.bgImageUrl}
                      onChange={(e) => persistDraft({ ...draft, bgImageUrl: e.target.value })}
                      placeholder="https://… or upload below"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pc-bgimg-file" className="text-xs text-muted-foreground">
                      Upload background image
                    </Label>
                    <Input
                      id="pc-bgimg-file"
                      type="file"
                      accept="image/*"
                      className="mt-1.5 cursor-pointer"
                      onChange={(e) =>
                        readImageFileAsDataUrl(e.target.files?.[0] ?? null, (dataUrl) =>
                          persistDraft({ ...draft, bgImageUrl: dataUrl, bgMode: "image" })
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="pc-bgimg-overlay">Dark overlay on image ({Math.round(draft.bgImageOverlay * 100)}%)</Label>
                    <input
                      id="pc-bgimg-overlay"
                      type="range"
                      min={0}
                      max={0.7}
                      step={0.05}
                      value={draft.bgImageOverlay}
                      className="mt-2 w-full max-w-md accent-primary"
                      onChange={(e) =>
                        persistDraft({ ...draft, bgImageOverlay: Number.parseFloat(e.target.value) })
                      }
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Increases contrast so white text stays readable over busy photos.
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <Label htmlFor="pc-qr">QR code URL (donate / campaign link)</Label>
                <Input
                  id="pc-qr"
                  className="mt-1.5 font-mono text-sm"
                  value={draft.qrTargetUrl}
                  onChange={(e) => persistDraft({ ...draft, qrTargetUrl: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Back — mail panel</CardTitle>
              <CardDescription>Return address and USPS-style layout preview (not to scale for postage).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="pc-ret-name">Return name</Label>
                  <Input
                    id="pc-ret-name"
                    className="mt-1.5"
                    value={draft.returnName}
                    onChange={(e) => persistDraft({ ...draft, returnName: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="pc-ret1">Return street</Label>
                  <Input
                    id="pc-ret1"
                    className="mt-1.5"
                    value={draft.returnLine1}
                    onChange={(e) => persistDraft({ ...draft, returnLine1: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pc-ret-city">City</Label>
                  <Input
                    id="pc-ret-city"
                    className="mt-1.5"
                    value={draft.returnCity}
                    onChange={(e) => persistDraft({ ...draft, returnCity: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="pc-ret-st">ST</Label>
                    <Input
                      id="pc-ret-st"
                      className="mt-1.5"
                      value={draft.returnState}
                      onChange={(e) => persistDraft({ ...draft, returnState: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pc-ret-zip">ZIP</Label>
                    <Input
                      id="pc-ret-zip"
                      className="mt-1.5"
                      value={draft.returnZip}
                      onChange={(e) => persistDraft({ ...draft, returnZip: e.target.value })}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="pc-back-msg">Branding / message area</Label>
                  <Textarea
                    id="pc-back-msg"
                    className="mt-1.5 min-h-[72px]"
                    value={draft.backMessage}
                    onChange={(e) => persistDraft({ ...draft, backMessage: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pc-back-panel">Back panel color</Label>
                  <Input
                    id="pc-back-panel"
                    type="color"
                    className="mt-1.5 h-10 w-full max-w-[120px] cursor-pointer"
                    value={draft.backPanelColor}
                    onChange={(e) => persistDraft({ ...draft, backPanelColor: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="pc-back-brand-img">Branding image (bottom band only)</Label>
                  <Input
                    id="pc-back-brand-img"
                    className="font-mono text-sm"
                    value={draft.backBrandImageUrl}
                    onChange={(e) => persistDraft({ ...draft, backBrandImageUrl: e.target.value })}
                    placeholder="https://… logo or texture — not placed over postage"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    className="cursor-pointer"
                    onChange={(e) =>
                      readImageFileAsDataUrl(e.target.files?.[0] ?? null, (dataUrl) =>
                        persistDraft({ ...draft, backBrandImageUrl: dataUrl })
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown behind the message in the lower branding row only, beside a reserved USPS automation strip — never
                    in the postage box or recipient address area.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Mailing list</CardTitle>
              <CardDescription>CSV columns: Name, Address, City, State, ZIP (one row per recipient).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pc-csv">Import CSV</Label>
                <Input
                  id="pc-csv"
                  type="file"
                  accept=".csv,text/csv"
                  className="mt-1.5 cursor-pointer"
                  onChange={(e) => handleCsvFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <FileUp className="size-3.5" /> Parsed client-side; nothing uploaded in this demo.
                </p>
              </div>
              <div>
                <Label htmlFor="pc-manual">Manual row (Name|Line1|City|ST|ZIP)</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="pc-manual"
                    value={manualRecipientLine}
                    onChange={(e) => setManualRecipientLine(e.target.value)}
                    placeholder="Jane Doe|456 Oak Rd|Tucson|AZ|85701"
                  />
                  <Button type="button" variant="secondary" onClick={addManualRecipient}>
                    Add
                  </Button>
                </div>
              </div>
              {draft.recipients.length > 0 ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
                  <p className="font-medium text-foreground">{draft.recipients.length} recipient(s)</p>
                  <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-muted-foreground">
                    {draft.recipients.slice(0, 8).map((r) => (
                      <li key={r.id}>
                        {r.name} — {r.line1}, {r.city}, {r.state} {r.zip}
                      </li>
                    ))}
                    {draft.recipients.length > 8 ? <li>…</li> : null}
                  </ul>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 text-destructive"
                    onClick={() => persistDraft({ ...draft, recipients: [] })}
                  >
                    <Trash2 className="size-3.5" />
                    Clear list
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Deployment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="dep-dig"
                    checked={draft.deployDigital}
                    onCheckedChange={(c) => persistDraft({ ...draft, deployDigital: c === true })}
                  />
                  <div>
                    <Label htmlFor="dep-dig" className="cursor-pointer font-medium">
                      Digital (free)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Export PNG/PDF and share by email or social; no postage.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="dep-print"
                    checked={draft.deployPrint}
                    onCheckedChange={(c) => persistDraft({ ...draft, deployPrint: c === true })}
                  />
                  <div>
                    <Label htmlFor="dep-print" className="cursor-pointer font-medium">
                      Print &amp; direct mail
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send print-ready files to your mail house or ACT print partner.
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-foreground">USPS postage &amp; rates (placeholder)</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect{" "}
                  <span className="font-mono text-xs">USPS Web Tools / Shipping API</span> or your vendor for live First-Class
                  / Marketing Mail quotes. Demo shows static estimate only.
                </p>
                <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                  Est. postage not configured — API key required.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Reusable templates</CardTitle>
              <CardDescription>Saved in this browser (localStorage).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input
                className="max-w-xs"
                placeholder="Template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={saveTemplate}>
                Save as template
              </Button>
              {templates.length > 0 ? (
                <Select
                  onValueChange={(v) => {
                    if (typeof v === "string" && v.length > 0) applyTemplate(v);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Load template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-amber-500/25 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg text-primary">
                <Package className="size-5" />
                Postcard packages — upsell
              </CardTitle>
              <CardDescription>
                {variant === "admin"
                  ? "Configure fulfillment SKUs in billing; parents see retail pricing."
                  : "Order professionally printed, addressed, and mailed batches through ACT."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {[
                { qty: "500", price: "From $289", note: "4×6 gloss, bulk tray" },
                { qty: "1,000", price: "From $499", note: "Best value / schools" },
                { qty: "2,500", price: "From $1,099", note: "District-wide push" },
              ].map((p) => (
                <div key={p.qty} className="rounded-lg border border-border bg-background p-4">
                  <p className="font-heading text-lg font-semibold text-primary">{p.qty} cards</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{p.price}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{p.note}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3 w-full">
                    Request quote
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg text-primary">
                <Printer className="size-5" />
                Print-safe guides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Add 0.125&Prime; bleed beyond trim on photos and full-bleed backgrounds.</li>
                <li>Keep critical text inside a 0.25&Prime; safety margin from trim.</li>
                <li>USPS clear zone: keep bottom-right clear for barcode (4.75&Prime; × 1.125&Prime; typical).</li>
                <li>Export 300 DPI PDF/X-1a for most commercial printers.</li>
                <li>Back panel: indicia must meet USPS placement rules for your mail class.</li>
                <li>
                  QR codes: keep at least ~0.75&Prime; square in print (≈225px at 300 DPI); our preview uses a fixed square
                  so it stays scannable on screen.
                </li>
                <li>
                  Back branding images belong in the lower message band only; keep machineable barcode / endorsement areas
                  clear per USPS layout for your mail class.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">Live front preview</CardTitle>
            </CardHeader>
            <CardContent>
              <PostcardFace sizeId={draft.sizeId} className="w-full max-w-sm bg-white">
                <div
                  className="flex h-full min-h-0 flex-col p-[6%] text-white"
                  style={frontBackgroundStyle(
                    draft.bgMode,
                    draft.bgColor,
                    draft.bgColorEnd,
                    draft.bgImageUrl,
                    draft.bgImageOverlay
                  )}
                >
                  <FeaturedPhotoFrame photoUrl={draft.photoUrl} mask={draft.photoMask} compact />
                  <h3 className="font-heading text-[clamp(0.65rem,2.8vw,0.95rem)] font-bold leading-tight drop-shadow-sm">
                    {draft.title}
                  </h3>
                  <p className="mt-1 text-[clamp(0.55rem,2vw,0.75rem)] font-medium opacity-95">{draft.subtitle}</p>
                  <p className="mt-2 text-[clamp(0.5rem,1.8vw,0.65rem)] italic opacity-90">{draft.tagline}</p>
                  <p className="mt-auto min-h-0 pt-2 text-[clamp(0.45rem,1.6vw,0.6rem)] leading-snug opacity-90">
                    {draft.notes}
                  </p>
                  <div className="mt-2 flex shrink-0 justify-end">
                    <PostcardQrImage src={qrSrc} />
                  </div>
                </div>
              </PostcardFace>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-base text-primary">Live back preview</CardTitle>
              <CardDescription>USPS-oriented layout (simplified).</CardDescription>
            </CardHeader>
            <CardContent>
              <PostcardFace sizeId={draft.sizeId} className="w-full max-w-sm bg-neutral-200">
                <PostcardBackInner draft={draft} sampleRecipient={sampleRecipient} />
              </PostcardFace>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled>
              <Download className="size-4" />
              Export PDF (wire)
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled>
              <Download className="size-4" />
              Export PNG (wire)
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>Postcard preview</DialogTitle>
            <DialogDescription>Full-size preview for proofing before print or digital send.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Front</p>
              <PostcardFace sizeId={draft.sizeId} className="w-full bg-white">
                <div
                  className="flex h-full min-h-0 flex-col p-[6%] text-white"
                  style={frontBackgroundStyle(
                    draft.bgMode,
                    draft.bgColor,
                    draft.bgColorEnd,
                    draft.bgImageUrl,
                    draft.bgImageOverlay
                  )}
                >
                  <FeaturedPhotoFrame photoUrl={draft.photoUrl} mask={draft.photoMask} />
                  <h3 className="font-heading text-lg font-bold sm:text-xl">{draft.title}</h3>
                  <p className="mt-1 text-sm font-medium">{draft.subtitle}</p>
                  <p className="mt-2 text-sm italic">{draft.tagline}</p>
                  <p className="mt-auto min-h-0 pt-3 text-xs leading-relaxed">{draft.notes}</p>
                  <div className="mt-2 flex shrink-0 justify-end">
                    <PostcardQrImage src={qrSrc} size="large" />
                  </div>
                </div>
              </PostcardFace>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Back</p>
              <PostcardFace sizeId={draft.sizeId} className="w-full bg-neutral-200">
                <PostcardBackInner draft={draft} sampleRecipient={sampleRecipient} large />
              </PostcardFace>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
