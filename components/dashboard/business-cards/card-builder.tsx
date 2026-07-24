"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Loader2,
  Palette,
  Plus,
  QrCode,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CardPreview } from "@/components/business-card/card-preview";
import { COLOR_PRESETS } from "@/lib/business-cards/defaults";
import type { BusinessCard, BusinessCardLink, LeadFormSettings } from "@/lib/business-cards/types";
import { cn } from "@/lib/utils";

const APP_BASE = typeof window !== "undefined" ? window.location.origin : "https://actsto.org";

type PanelKey = "content" | "links" | "appearance" | "splash" | "qr" | "forms" | "sections" | "settings";

const PANELS: { key: PanelKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "content", label: "Content", Icon: User },
  { key: "links", label: "Links", Icon: LinkIcon },
  { key: "appearance", label: "Color modes", Icon: Palette },
  { key: "splash", label: "Splash page", Icon: Sparkles },
  { key: "qr", label: "QR code", Icon: QrCode },
  { key: "forms", label: "Forms", Icon: Eye },
  { key: "sections", label: "Sections", Icon: ArrowUp },
  { key: "settings", label: "Settings", Icon: Settings },
];

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `tmp-${Math.random().toString(36).slice(2)}`;
  }
}

export function CardBuilder({
  initial,
  isAdmin,
  onBack,
  onSaved,
}: {
  initial: BusinessCard;
  isAdmin: boolean;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [card, setCard] = useState<BusinessCard>(initial);
  const [panel, setPanel] = useState<PanelKey>("content");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<BusinessCard>) => setCard((c) => ({ ...c, ...p }));
  const patchLead = (p: Partial<LeadFormSettings>) =>
    setCard((c) => ({ ...c, leadFormSettings: { ...c.leadFormSettings, ...p } }));

  async function save(publish: boolean) {
    setBusy("save");
    setError(null);
    try {
      const payload = { ...card, status: publish ? "published" : card.status === "published" ? "published" : "draft" };
      const res = await fetch("/api/business-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { card?: BusinessCard; error?: string } | null;
      if (!res.ok || !data?.card) throw new Error(data?.error ?? "Could not save.");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  const publicUrl = `${APP_BASE}/c/${card.slug || "your-card"}`;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card p-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1.5 size-4" /> Back
          </Button>
          <span className="font-heading text-sm font-semibold text-primary">
            {card.id ? "Edit card" : "New card"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {card.id ? (
            <Button type="button" variant="outline" size="sm" onClick={() => window.open(publicUrl, "_blank")}>
              <ExternalLink className="mr-1.5 size-4" /> Public page
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => void save(false)} disabled={busy === "save"}>
            {busy === "save" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />}
            Save card
          </Button>
          <Button type="button" size="sm" onClick={() => void save(true)} disabled={busy === "save"}>
            Publish &amp; save
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[180px_1fr_360px]">
        {/* Left: panel nav */}
        <div className="space-y-1 rounded-lg border border-border/80 bg-muted/15 p-2 lg:sticky lg:top-4 lg:self-start">
          {PANELS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPanel(key)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors",
                panel === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Center: active panel */}
        <div className="min-w-0 rounded-lg border border-border/80 bg-card p-4">
          {panel === "content" && <ContentPanel card={card} patch={patch} setBusy={setBusy} busy={busy} />}
          {panel === "links" && <LinksPanel card={card} setCard={setCard} />}
          {panel === "appearance" && <AppearancePanel card={card} patch={patch} />}
          {panel === "splash" && <SplashPanel card={card} setCard={setCard} />}
          {panel === "qr" && <QrPanel card={card} patch={patch} publicUrl={publicUrl} />}
          {panel === "forms" && <FormsPanel card={card} patchLead={patchLead} />}
          {panel === "sections" && <SectionsPanel card={card} setCard={setCard} />}
          {panel === "settings" && <SettingsPanel card={card} patch={patch} isAdmin={isAdmin} />}
        </div>

        {/* Right: live preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 text-center text-xs text-muted-foreground">Live preview</p>
          <div className="rounded-2xl bg-muted/40 p-4">
            <CardPreview card={card} publicUrl={publicUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Image upload helper ─────────────────────────────────────────────────────
function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/business-cards/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { url?: string } | null;
      if (data?.url) onChange(data.url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-12 rounded-lg border border-border/60 object-cover" />
        ) : (
          <div className="grid size-12 place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
            <Upload className="size-4" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Upload className="mr-1.5 size-3.5" />}
          Upload
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ── Panels ──────────────────────────────────────────────────────────────────
function ContentPanel({
  card,
  patch,
}: {
  card: BusinessCard;
  patch: (p: Partial<BusinessCard>) => void;
  setBusy: (v: string | null) => void;
  busy: string | null;
}) {
  return (
    <div className="space-y-4">
      <p className="font-heading text-base font-semibold text-primary">Profile</p>
      <div className="flex flex-wrap gap-4">
        <ImageField label="Profile photo" value={card.profilePhotoUrl} onChange={(v) => patch({ profilePhotoUrl: v })} />
        <ImageField label="Logo (optional)" value={card.logoUrl} onChange={(v) => patch({ logoUrl: v })} />
      </div>
      <Field label="Display name">
        <Input value={card.displayName ?? ""} onChange={(e) => patch({ displayName: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name">
          <Input value={card.firstName ?? ""} onChange={(e) => patch({ firstName: e.target.value })} />
        </Field>
        <Field label="Last name">
          <Input value={card.lastName ?? ""} onChange={(e) => patch({ lastName: e.target.value })} />
        </Field>
      </div>
      <Field label="Job title">
        <Input value={card.jobTitle ?? ""} onChange={(e) => patch({ jobTitle: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company">
          <Input value={card.companyName ?? ""} onChange={(e) => patch({ companyName: e.target.value })} />
        </Field>
        <Field label="Department">
          <Input value={card.department ?? ""} onChange={(e) => patch({ department: e.target.value })} />
        </Field>
      </div>
      <Field label="Bio">
        <Textarea value={card.bio ?? ""} onChange={(e) => patch({ bio: e.target.value })} className="min-h-[80px]" />
      </Field>

      <p className="mt-2 font-heading text-base font-semibold text-primary">Contact</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone">
          <Input value={card.primaryPhone ?? ""} onChange={(e) => patch({ primaryPhone: e.target.value })} />
        </Field>
        <Field label="SMS number">
          <Input value={card.smsPhone ?? ""} onChange={(e) => patch({ smsPhone: e.target.value })} />
        </Field>
      </div>
      <Field label="Email">
        <Input value={card.primaryEmail ?? ""} onChange={(e) => patch({ primaryEmail: e.target.value })} />
      </Field>
      <Field label="Website">
        <Input value={card.websiteUrl ?? ""} onChange={(e) => patch({ websiteUrl: e.target.value })} className="font-mono text-sm" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Map / address URL">
          <Input value={card.mapsUrl ?? ""} onChange={(e) => patch({ mapsUrl: e.target.value })} className="font-mono text-sm" />
        </Field>
        <Field label="Intro video URL">
          <Input value={card.introVideoUrl ?? ""} onChange={(e) => patch({ introVideoUrl: e.target.value })} className="font-mono text-sm" />
        </Field>
      </div>
    </div>
  );
}

function LinksPanel({ card, setCard }: { card: BusinessCard; setCard: React.Dispatch<React.SetStateAction<BusinessCard>> }) {
  const links = card.links ?? [];
  const update = (id: string, p: Partial<BusinessCardLink>) =>
    setCard((c) => ({ ...c, links: c.links.map((l) => (l.id === id ? { ...l, ...p } : l)) }));
  const add = () =>
    setCard((c) => ({
      ...c,
      links: [
        ...c.links,
        { id: uid(), label: "New link", url: "", linkType: "custom", icon: null, displayOrder: c.links.length + 1, isVisible: true, openInNewTab: true, clickCount: 0 },
      ],
    }));
  const remove = (id: string) => setCard((c) => ({ ...c, links: c.links.filter((l) => l.id !== id) }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-heading text-base font-semibold text-primary">Links &amp; socials</p>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="mr-1.5 size-3.5" /> Add link
        </Button>
      </div>
      {links.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No links yet. Add website buttons, socials, booking links and more.
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((l) => (
            <div key={l.id} className="flex items-start gap-2 rounded-md border border-border/60 p-2">
              <div className="grid flex-1 gap-1.5 sm:grid-cols-2">
                <Input value={l.label} onChange={(e) => update(l.id, { label: e.target.value })} placeholder="Label" className="h-8" />
                <Input value={l.url} onChange={(e) => update(l.id, { url: e.target.value })} placeholder="https://…" className="h-8 font-mono text-xs" />
              </div>
              <button
                type="button"
                onClick={() => update(l.id, { isVisible: !l.isVisible })}
                title={l.isVisible ? "Visible" : "Hidden"}
                className="inline-flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted"
              >
                {l.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => remove(l.id)}
                aria-label="Remove link"
                className="inline-flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-8 cursor-pointer rounded border border-border" aria-label={label} />
      <div>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-28 font-mono text-xs" />
      </div>
    </div>
  );
}

function AppearancePanel({ card, patch }: { card: BusinessCard; patch: (p: Partial<BusinessCard>) => void }) {
  const media = card.mediaSettings || {};
  return (
    <div className="space-y-4">
      <p className="font-heading text-base font-semibold text-primary">Color modes</p>
      <div>
        <Label className="text-xs text-muted-foreground">Presets</Label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => patch({ backgroundColor: p.bg, accentColor: p.accent, textColor: p.text })}
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
            >
              <span className="flex">
                <span className="size-4 rounded-l" style={{ background: p.bg }} />
                <span className="size-4" style={{ background: p.accent }} />
                <span className="size-4 rounded-r" style={{ background: p.text }} />
              </span>
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <ColorField label="Background" value={card.backgroundColor} onChange={(v) => patch({ backgroundColor: v })} />
        <ColorField label="Accent" value={card.accentColor} onChange={(v) => patch({ accentColor: v })} />
        <ColorField label="Text" value={card.textColor} onChange={(v) => patch({ textColor: v })} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Theme mode">
          <select
            value={card.themeMode}
            onChange={(e) => patch({ themeMode: e.target.value as BusinessCard["themeMode"] })}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="both">Both (viewer toggle)</option>
          </select>
        </Field>
        <Field label="Profile shape">
          <select
            value={media.profile_shape ?? "circle"}
            onChange={(e) => patch({ mediaSettings: { ...media, profile_shape: e.target.value as "circle" | "rounded" | "square" } })}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="circle">Circle</option>
            <option value="rounded">Rounded</option>
            <option value="square">Square</option>
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(media.profile_outline)}
          onChange={(e) => patch({ mediaSettings: { ...media, profile_outline: e.target.checked } })}
          className="size-4"
        />
        Accent outline around profile photo
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={media.content_align === "left"}
          onChange={(e) => patch({ mediaSettings: { ...media, content_align: e.target.checked ? "left" : "center" } })}
          className="size-4"
        />
        Left-align content (default centered)
      </label>
    </div>
  );
}

function SplashPanel({ card, setCard }: { card: BusinessCard; setCard: React.Dispatch<React.SetStateAction<BusinessCard>> }) {
  const opener = card.sections.find((s) => s.sectionType === "opener");
  const content = (opener?.content ?? {}) as Record<string, unknown>;
  const setOpener = (visible: boolean, next?: Record<string, unknown>) =>
    setCard((c) => ({
      ...c,
      sections: c.sections.map((s) =>
        s.sectionType === "opener" ? { ...s, isVisible: visible, content: next ?? s.content } : s,
      ),
    }));
  const setField = (key: string, value: unknown) => setOpener(opener?.isVisible ?? true, { ...content, [key]: value });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-heading text-base font-semibold text-primary">Splash / opener page</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(opener?.isVisible)} onChange={(e) => setOpener(e.target.checked)} className="size-4" />
          Enabled
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        A full-screen intro shown before the card. Great for “You were created for more” style openers.
      </p>
      <Field label="Eyebrow">
        <Input value={(content.eyebrow as string) ?? ""} onChange={(e) => setField("eyebrow", e.target.value)} placeholder="You were created for more" />
      </Field>
      <Field label="Title">
        <Input value={(content.title as string) ?? ""} onChange={(e) => setField("title", e.target.value)} />
      </Field>
      <Field label="Subtitle">
        <Textarea value={(content.subtitle as string) ?? ""} onChange={(e) => setField("subtitle", e.target.value)} className="min-h-[60px]" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Primary button label">
          <Input value={(content.primary_label as string) ?? ""} onChange={(e) => setField("primary_label", e.target.value)} placeholder="View card" />
        </Field>
        <Field label="Secondary button label">
          <Input value={(content.secondary_label as string) ?? ""} onChange={(e) => setField("secondary_label", e.target.value)} placeholder="Call me" />
        </Field>
      </div>
      <Field label="Auto-advance after (seconds, 0 = manual)">
        <Input
          type="number"
          value={Number(content.duration_seconds ?? 0)}
          onChange={(e) => setField("duration_seconds", Number(e.target.value) || 0)}
          className="w-32"
        />
      </Field>
    </div>
  );
}

function QrPanel({ card, patch, publicUrl }: { card: BusinessCard; patch: (p: Partial<BusinessCard>) => void; publicUrl: string }) {
  const qr = card.qrSettings || {};
  return (
    <div className="space-y-4">
      <p className="font-heading text-base font-semibold text-primary">QR code</p>
      <div className="flex flex-wrap items-start gap-6">
        <div className="rounded-xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/cards/qr?url=${encodeURIComponent(publicUrl)}&size=320&fg=${encodeURIComponent(qr.foreground || "#001138")}&bg=${encodeURIComponent(qr.background || "#ffffff")}`}
            alt="QR preview"
            className="size-40"
          />
        </div>
        <div className="space-y-3">
          <ColorField label="Foreground" value={qr.foreground || "#001138"} onChange={(v) => patch({ qrSettings: { ...qr, foreground: v } })} />
          <ColorField label="Background" value={qr.background || "#ffffff"} onChange={(v) => patch({ qrSettings: { ...qr, background: v } })} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/cards/qr?url=${encodeURIComponent(publicUrl)}&size=1024&fg=${encodeURIComponent(qr.foreground || "#001138")}`, "_blank")}
          >
            <Upload className="mr-1.5 size-3.5" /> Download PNG
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">The QR points at your public card URL: <span className="font-mono">{publicUrl}</span></p>
    </div>
  );
}

function FormsPanel({ card, patchLead }: { card: BusinessCard; patchLead: (p: Partial<LeadFormSettings>) => void }) {
  const form = card.leadFormSettings;
  const toggleField = (key: string, prop: "enabled" | "required", value: boolean) =>
    patchLead({ fields: form.fields.map((f) => (f.key === key ? { ...f, [prop]: value } : f)) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-heading text-base font-semibold text-primary">Lead capture form</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.enabled} onChange={(e) => patchLead({ enabled: e.target.checked })} className="size-4" />
          Enabled
        </label>
      </div>
      <Field label="Title">
        <Input value={form.title} onChange={(e) => patchLead({ title: e.target.value })} />
      </Field>
      <Field label="Description">
        <Textarea value={form.description} onChange={(e) => patchLead({ description: e.target.value })} className="min-h-[56px]" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Button label (on card)">
          <Input value={form.button_label} onChange={(e) => patchLead({ button_label: e.target.value })} />
        </Field>
        <Field label="Submit label">
          <Input value={form.submit_label} onChange={(e) => patchLead({ submit_label: e.target.value })} />
        </Field>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Fields</Label>
        <div className="mt-1.5 space-y-1.5">
          {form.fields.map((f) => (
            <div key={f.key} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
              <span className="capitalize">{f.label}</span>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={f.enabled} onChange={(e) => toggleField(f.key, "enabled", e.target.checked)} className="size-3.5" />
                  Show
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={f.required} onChange={(e) => toggleField(f.key, "required", e.target.checked)} className="size-3.5" />
                  Required
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionsPanel({ card, setCard }: { card: BusinessCard; setCard: React.Dispatch<React.SetStateAction<BusinessCard>> }) {
  const sections = [...card.sections].sort((a, b) => a.displayOrder - b.displayOrder);
  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setCard((c) => ({ ...c, sections: next.map((s, i) => ({ ...s, displayOrder: i + 1 })) }));
  };
  const toggle = (id: string) =>
    setCard((c) => ({ ...c, sections: c.sections.map((s) => (s.id === id ? { ...s, isVisible: !s.isVisible } : s)) }));

  return (
    <div className="space-y-3">
      <p className="font-heading text-base font-semibold text-primary">Sections &amp; order</p>
      <p className="text-xs text-muted-foreground">Toggle visibility and reorder how sections stack on the card.</p>
      <div className="space-y-1.5">
        {sections.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
            <span className="flex-1 text-sm font-medium">{s.label}</span>
            <button type="button" onClick={() => reorder(i, i - 1)} disabled={i === 0} className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" onClick={() => reorder(i, i + 1)} disabled={i === sections.length - 1} className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30">
              <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => toggle(s.id)}
              className={cn("inline-flex size-7 items-center justify-center rounded", s.isVisible ? "text-primary" : "text-muted-foreground")}
            >
              {s.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ card, patch, isAdmin }: { card: BusinessCard; patch: (p: Partial<BusinessCard>) => void; isAdmin: boolean }) {
  const autos = card.automations ?? [];
  const notifyOn = autos.some((a) => a.action === "notify_owner_email" && a.enabled);
  const toggleNotify = (on: boolean) => {
    const others = autos.filter((a) => a.action !== "notify_owner_email");
    patch({ automations: [...others, { id: uid(), trigger: "lead_submit", action: "notify_owner_email", enabled: on }] });
  };

  return (
    <div className="space-y-4">
      <p className="font-heading text-base font-semibold text-primary">Settings</p>
      <Field label="Card name (internal)">
        <Input value={card.cardName} onChange={(e) => patch({ cardName: e.target.value })} />
      </Field>
      <Field label="Public URL slug">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">/c/</span>
          <Input value={card.slug} onChange={(e) => patch({ slug: e.target.value })} placeholder="auto from name" className="font-mono text-sm" />
        </div>
      </Field>
      <Field label="Status">
        <select
          value={card.status}
          onChange={(e) => patch({ status: e.target.value as BusinessCard["status"] })}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
          <option value="archived">Archived</option>
        </select>
      </Field>
      <Field label="NFC status">
        <select
          value={card.nfcStatus}
          onChange={(e) => patch({ nfcStatus: e.target.value })}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="not_ordered">Not ordered</option>
          <option value="ordered">Ordered</option>
          <option value="linked">Linked / active</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notifyOn} onChange={(e) => toggleNotify(e.target.checked)} className="size-4" />
        Email me when someone submits the lead form
      </label>
      {isAdmin ? <p className="text-xs text-muted-foreground">As an admin you can also manage other staff cards from the “All staff” view.</p> : null}
    </div>
  );
}
