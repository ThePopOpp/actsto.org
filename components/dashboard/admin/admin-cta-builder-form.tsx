"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

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

type CtaBlock = {
  key: string;
  placement: string;
  path?: string | null;
  heading: string;
  subheading?: string | null;
  body?: string | null;
  primaryLabel: string;
  primaryUrl: string;
  primaryVariant: string;
  showSecondary: boolean;
  secondaryLabel?: string | null;
  secondaryUrl?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  bgColor?: string | null;
  bgColorEnd?: string | null;
  useGradient: boolean;
  textColor?: string | null;
  padding: string;
  visible: boolean;
  sortOrder: number;
};

const PLACEMENTS = [
  ["home_hero", "Homepage - hero"],
  ["home_new_campaigns", "Homepage - New Campaigns action"],
  ["home_pre_footer", "Homepage - pre-footer CTA"],
  ["blog_archive_bottom", "Blog - archive bottom"],
  ["campaigns_top", "Campaigns - top"],
  ["how_it_works_hero", "How It Works - hero"],
  ["how_it_works_individuals", "How It Works - individuals CTA"],
  ["how_it_works_bottom", "How It Works - bottom"],
  ["about_hero", "About - hero"],
  ["about_mid", "About - middle CTA"],
  ["about_bottom", "About - bottom CTA"],
  ["site_header_primary", "Header - primary button"],
  ["site_header_secondary", "Header - secondary button"],
  ["site_header_mobile_extra", "Header - mobile extra button"],
  ["custom_path", "Custom URL path"],
] as const;

const emptyBlock: CtaBlock = {
  key: "custom-cta-v1",
  placement: "custom_path",
  path: "",
  heading: "New CTA block",
  subheading: "",
  body: "",
  primaryLabel: "Learn more",
  primaryUrl: "/",
  primaryVariant: "default",
  showSecondary: false,
  secondaryLabel: "",
  secondaryUrl: "",
  imageUrl: "",
  imageAlt: "",
  bgColor: "#e8eef7",
  bgColorEnd: "",
  useGradient: false,
  textColor: "",
  padding: "default",
  visible: true,
  sortOrder: 500,
};

function sanitizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminCtaBuilderForm() {
  const [blocks, setBlocks] = useState<CtaBlock[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState<CtaBlock>(emptyBlock);
  const [status, setStatus] = useState<string | null>("Loading CTA blocks...");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadBlocks(nextSelectedKey?: string) {
    setError(null);
    setStatus("Loading CTA blocks...");
    const res = await fetch("/api/admin/cta-blocks", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { blocks?: CtaBlock[]; error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? "Failed to load CTA blocks.");
      setStatus(null);
      return;
    }
    const loaded = data?.blocks ?? [];
    setBlocks(loaded);
    const key = nextSelectedKey ?? selectedKey ?? loaded[0]?.key ?? "";
    const next = loaded.find((block) => block.key === key) ?? loaded[0] ?? emptyBlock;
    setSelectedKey(next.key);
    setDraft(next);
    setStatus(null);
  }

  useEffect(() => {
    void loadBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placementLabel = useMemo(
    () => PLACEMENTS.find(([value]) => value === draft.placement)?.[1] ?? draft.placement,
    [draft.placement],
  );

  function patch(patchValue: Partial<CtaBlock>) {
    setDraft((current) => ({ ...current, ...patchValue }));
    setError(null);
    setStatus(null);
  }

  async function save() {
    const key = sanitizeKey(draft.key);
    if (!key) {
      setError("Internal key is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    const nextDraft = { ...draft, key };
    try {
      const res = await fetch(`/api/admin/cta-blocks/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block: nextDraft }),
      });
      const data = (await res.json().catch(() => null)) as { block?: CtaBlock; error?: string } | null;
      if (!res.ok || !data?.block) throw new Error(data?.error ?? "Failed to save CTA block.");
      setStatus("CTA block saved.");
      await loadBlocks(data.block.key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save CTA block.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete CTA block "${draft.key}"? Default slots will fall back to built-in content.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cta-blocks/${encodeURIComponent(draft.key)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete CTA block.");
      setStatus("CTA block deleted. Built-in fallback content will appear unless another block is saved.");
      setSelectedKey("");
      await loadBlocks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete CTA block.");
    } finally {
      setSaving(false);
    }
  }

  function createNew() {
    const key = `custom-cta-${Date.now()}`;
    const next = { ...emptyBlock, key };
    setSelectedKey(key);
    setDraft(next);
    setStatus("Draft created. Save it to publish this CTA block.");
    setError(null);
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-primary/25 bg-muted/15">
        <CardContent className="p-4 text-sm text-muted-foreground">
          CTA Blocks now persist through API routes and can drive specific frontend slots. Built-in defaults stay in
          place until a block is saved for that slot.
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <Label>Select CTA block</Label>
          <Select
            value={selectedKey}
            onValueChange={(key) => {
              if (!key) return;
              const next = blocks.find((block) => block.key === key);
              if (next) {
                setSelectedKey(key);
                setDraft(next);
                setStatus(null);
                setError(null);
              }
            }}
          >
            <SelectTrigger className="mt-1.5 h-10 w-full max-w-xl">
              <SelectValue placeholder="Select a CTA block" />
            </SelectTrigger>
            <SelectContent>
              {blocks.map((block) => (
                <SelectItem key={block.key} value={block.key}>
                  {block.key} - {block.placement}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" className="gap-1.5" onClick={createNew}>
          <Plus className="size-4" aria-hidden />
          New CTA Block
        </Button>
      </div>

      {error ? <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
      {status ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">{status}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Placement & key</CardTitle>
              <CardDescription>Internal key is stable; placement maps to a public frontend slot.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="cta-key">Internal key / ID</Label>
                <Input id="cta-key" className="mt-1.5 font-mono text-sm" value={draft.key} onChange={(e) => patch({ key: e.target.value })} />
              </div>
              <div>
                <Label>Placement</Label>
                <Select value={draft.placement} onValueChange={(placement) => placement && patch({ placement })}>
                  <SelectTrigger className="mt-1.5 h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {draft.placement === "custom_path" ? (
                <div>
                  <Label htmlFor="cta-path">Custom path</Label>
                  <Input id="cta-path" className="mt-1.5 font-mono text-sm" value={draft.path ?? ""} onChange={(e) => patch({ path: e.target.value })} placeholder="/about-us" />
                </div>
              ) : null}
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox id="cta-visible" checked={draft.visible} onCheckedChange={(checked) => patch({ visible: checked === true })} />
                <Label htmlFor="cta-visible" className="cursor-pointer font-normal">Visible on frontend</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Copy</CardTitle>
              <CardDescription>Heading, optional eyebrow/subheading, and body copy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cta-heading">Heading</Label>
                <Input id="cta-heading" className="mt-1.5" value={draft.heading} onChange={(e) => patch({ heading: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cta-sub">Sub-heading / eyebrow</Label>
                <Input id="cta-sub" className="mt-1.5" value={draft.subheading ?? ""} onChange={(e) => patch({ subheading: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cta-body">Body / supporting content</Label>
                <Textarea id="cta-body" className="mt-1.5 min-h-[100px]" value={draft.body ?? ""} onChange={(e) => patch({ body: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Buttons</CardTitle>
              <CardDescription>Primary and optional secondary actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cta-pri-label">Primary button label</Label>
                  <Input id="cta-pri-label" className="mt-1.5" value={draft.primaryLabel} onChange={(e) => patch({ primaryLabel: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cta-pri-url">Primary URL</Label>
                  <Input id="cta-pri-url" className="mt-1.5 font-mono text-sm" value={draft.primaryUrl} onChange={(e) => patch({ primaryUrl: e.target.value })} />
                </div>
                <div>
                  <Label>Primary style</Label>
                  <Select value={draft.primaryVariant} onValueChange={(primaryVariant) => primaryVariant && patch({ primaryVariant })}>
                    <SelectTrigger className="mt-1.5 h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Solid primary</SelectItem>
                      <SelectItem value="cta">ACT red CTA</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="cta-sec-on" checked={draft.showSecondary} onCheckedChange={(checked) => patch({ showSecondary: checked === true })} />
                <Label htmlFor="cta-sec-on" className="cursor-pointer font-normal">Show secondary button</Label>
              </div>
              {draft.showSecondary ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cta-sec-label">Secondary label</Label>
                    <Input id="cta-sec-label" className="mt-1.5" value={draft.secondaryLabel ?? ""} onChange={(e) => patch({ secondaryLabel: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="cta-sec-url">Secondary URL</Label>
                    <Input id="cta-sec-url" className="mt-1.5 font-mono text-sm" value={draft.secondaryUrl ?? ""} onChange={(e) => patch({ secondaryUrl: e.target.value })} />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-primary">Media, layout & colors</CardTitle>
              <CardDescription>Optional image, spacing, and controlled brand styling.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cta-img">Image URL</Label>
                <Input id="cta-img" className="mt-1.5 font-mono text-sm" value={draft.imageUrl ?? ""} onChange={(e) => patch({ imageUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="cta-img-alt">Image alt text</Label>
                <Input id="cta-img-alt" className="mt-1.5" value={draft.imageAlt ?? ""} onChange={(e) => patch({ imageAlt: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Vertical padding</Label>
                  <Select value={draft.padding} onValueChange={(padding) => padding && patch({ padding })}>
                    <SelectTrigger className="mt-1.5 h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cta-bg">Background</Label>
                  <Input id="cta-bg" className="mt-1.5 font-mono text-sm" value={draft.bgColor ?? ""} onChange={(e) => patch({ bgColor: e.target.value })} placeholder="brand default" />
                </div>
                <div>
                  <Label htmlFor="cta-text">Text color</Label>
                  <Input id="cta-text" className="mt-1.5 font-mono text-sm" value={draft.textColor ?? ""} onChange={(e) => patch({ textColor: e.target.value })} placeholder="inherit" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="cta-gradient" checked={draft.useGradient} onCheckedChange={(checked) => patch({ useGradient: checked === true })} />
                <Label htmlFor="cta-gradient" className="cursor-pointer font-normal">Use gradient background</Label>
              </div>
              {draft.useGradient ? (
                <div>
                  <Label htmlFor="cta-bg-end">Gradient end color</Label>
                  <Input id="cta-bg-end" className="mt-1.5 font-mono text-sm" value={draft.bgColorEnd ?? ""} onChange={(e) => patch({ bgColorEnd: e.target.value })} placeholder="#ffffff" />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save CTA Block"}</Button>
            <Button type="button" variant="outline" className="gap-1.5" onClick={() => void loadBlocks(draft.key)} disabled={saving}>
              <RotateCcw className="size-4" aria-hidden />
              Reload
            </Button>
            <Button type="button" variant="destructive" className="gap-1.5" onClick={() => void remove()} disabled={saving}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          </div>
        </form>

        <Card className="h-fit border-border/80 xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Preview</CardTitle>
            <CardDescription>{placementLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-xl border border-border/80 p-5 shadow-inner"
              style={{
                background: draft.useGradient && draft.bgColorEnd
                  ? `linear-gradient(135deg, ${draft.bgColor || "var(--muted)"}, ${draft.bgColorEnd})`
                  : draft.bgColor || undefined,
                color: draft.textColor || undefined,
              }}
            >
              {draft.subheading ? <p className="text-xs font-semibold uppercase tracking-wide text-act-red">{draft.subheading}</p> : null}
              <h3 className="mt-2 font-heading text-2xl font-semibold text-primary">{draft.heading}</h3>
              {draft.body ? <p className="mt-3 text-sm leading-relaxed opacity-80">{draft.body}</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">{draft.primaryLabel}</span>
                {draft.showSecondary && draft.secondaryLabel ? (
                  <span className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-primary">{draft.secondaryLabel}</span>
                ) : null}
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between gap-3"><dt>Key</dt><dd className="font-mono text-foreground">{draft.key}</dd></div>
              <div className="flex justify-between gap-3"><dt>Placement</dt><dd className="font-mono text-foreground">{draft.placement}</dd></div>
              <div className="flex justify-between gap-3"><dt>Visible</dt><dd className="font-mono text-foreground">{draft.visible ? "yes" : "no"}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
