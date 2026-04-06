"use client";

import { useState } from "react";

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

const FORM_ID = "admin-cta-builder";

export function AdminCtaBuilderForm() {
  const [saved, setSaved] = useState(false);
  const [internalKey, setInternalKey] = useState("blog-archive-cta-v1");
  const [placement, setPlacement] = useState("blog_archive");
  const [customPath, setCustomPath] = useState("");
  const [heading, setHeading] = useState("Ready to fund a Christ-centered education?");
  const [subheading, setSubheading] = useState(
    "Start a campaign, make a tax-credit gift, or explore active fundraisers."
  );
  const [body, setBody] = useState(
    "Connect families, donors, and schools through Arizona’s private school tax credit programs."
  );
  const [primaryLabel, setPrimaryLabel] = useState("Create an account");
  const [primaryUrl, setPrimaryUrl] = useState("/register");
  const [primaryVariant, setPrimaryVariant] = useState("default");
  const [secondaryLabel, setSecondaryLabel] = useState("Browse campaigns");
  const [secondaryUrl, setSecondaryUrl] = useState("/campaigns");
  const [showSecondary, setShowSecondary] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [bgColor, setBgColor] = useState("#e8eef7");
  const [bgColorEnd, setBgColorEnd] = useState("");
  const [useGradient, setUseGradient] = useState(false);
  const [textColor, setTextColor] = useState("");
  const [padding, setPadding] = useState("default");
  const [visible, setVisible] = useState(true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Placement &amp; key</CardTitle>
          <CardDescription>
            Identifies this block in your CMS or JSON config. Frontend can map placement to routes or slots.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="cta-key">Internal key / ID</Label>
            <Input
              id="cta-key"
              className="mt-1.5 font-mono text-sm"
              value={internalKey}
              onChange={(e) => setInternalKey(e.target.value)}
              placeholder="e.g. home-hero-primary"
            />
          </div>
          <div>
            <Label>Placement</Label>
            <Select value={placement} onValueChange={(v) => setPlacement(v ?? "blog_archive")}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="home_hero">Homepage — hero</SelectItem>
                <SelectItem value="home_mid">Homepage — mid page</SelectItem>
                <SelectItem value="blog_archive">Blog — archive (below list)</SelectItem>
                <SelectItem value="campaigns_top">Campaigns — top</SelectItem>
                <SelectItem value="custom_path">Custom URL path</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {placement === "custom_path" ? (
            <div>
              <Label htmlFor="cta-path">Path</Label>
              <Input
                id="cta-path"
                className="mt-1.5 font-mono text-sm"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="/about-us"
              />
            </div>
          ) : null}
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox id="cta-visible" checked={visible} onCheckedChange={(c) => setVisible(c === true)} />
            <Label htmlFor="cta-visible" className="cursor-pointer font-normal">
              Visible on frontend when published
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Copy</CardTitle>
          <CardDescription>Heading hierarchy and supporting text shown in the CTA strip or card.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cta-heading">Heading</Label>
            <Input id="cta-heading" className="mt-1.5" value={heading} onChange={(e) => setHeading(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cta-sub">Sub-heading</Label>
            <Input id="cta-sub" className="mt-1.5" value={subheading} onChange={(e) => setSubheading(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cta-body">Body / supporting content</Label>
            <Textarea id="cta-body" className="mt-1.5 min-h-[100px]" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Buttons</CardTitle>
          <CardDescription>Primary and optional secondary actions (labels + destination URLs).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cta-pri-label">Primary button label</Label>
              <Input
                id="cta-pri-label"
                className="mt-1.5"
                value={primaryLabel}
                onChange={(e) => setPrimaryLabel(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cta-pri-url">Primary URL</Label>
              <Input
                id="cta-pri-url"
                className="mt-1.5 font-mono text-sm"
                value={primaryUrl}
                onChange={(e) => setPrimaryUrl(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Primary style</Label>
              <Select value={primaryVariant} onValueChange={(v) => setPrimaryVariant(v ?? "default")}>
                <SelectTrigger className="mt-1.5 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Solid (primary)</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="ghost">Ghost / link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cta-sec-on" checked={showSecondary} onCheckedChange={(c) => setShowSecondary(c === true)} />
            <Label htmlFor="cta-sec-on" className="cursor-pointer font-normal">
              Show secondary button
            </Label>
          </div>
          {showSecondary ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cta-sec-label">Secondary label</Label>
                <Input
                  id="cta-sec-label"
                  className="mt-1.5"
                  value={secondaryLabel}
                  onChange={(e) => setSecondaryLabel(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cta-sec-url">Secondary URL</Label>
                <Input
                  id="cta-sec-url"
                  className="mt-1.5 font-mono text-sm"
                  value={secondaryUrl}
                  onChange={(e) => setSecondaryUrl(e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Media &amp; layout</CardTitle>
          <CardDescription>Optional hero image and spacing preset for the block container.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cta-img">Image URL (optional)</Label>
            <Input
              id="cta-img"
              className="mt-1.5 font-mono text-sm"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="cta-img-alt">Image alt text</Label>
            <Input id="cta-img-alt" className="mt-1.5" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
          </div>
          <div>
            <Label>Vertical padding</Label>
            <Select value={padding} onValueChange={(v) => setPadding(v ?? "default")}>
              <SelectTrigger className="mt-1.5 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Colors</CardTitle>
          <CardDescription>Background and optional gradient; override text color if needed for contrast.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cta-bg">Background color</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="cta-bg"
                  type="color"
                  className="h-10 w-14 cursor-pointer p-1"
                  value={bgColor.length === 7 ? bgColor : "#e8eef7"}
                  onChange={(e) => setBgColor(e.target.value)}
                />
                <Input
                  className="font-mono text-sm"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  placeholder="#e8eef7"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cta-text">Text color (optional)</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="cta-text"
                  type="color"
                  className="h-10 w-14 cursor-pointer p-1"
                  value={textColor || "#1a1a1a"}
                  onChange={(e) => setTextColor(e.target.value)}
                />
                <Input
                  className="font-mono text-sm"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="inherit"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cta-grad" checked={useGradient} onCheckedChange={(c) => setUseGradient(c === true)} />
            <Label htmlFor="cta-grad" className="cursor-pointer font-normal">
              Use two-color gradient background
            </Label>
          </div>
          {useGradient ? (
            <div>
              <Label htmlFor="cta-bg-end">Gradient end color</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="cta-bg-end"
                  type="color"
                  className="h-10 w-14 cursor-pointer p-1"
                  value={bgColorEnd.length === 7 ? bgColorEnd : "#ffffff"}
                  onChange={(e) => setBgColorEnd(e.target.value)}
                />
                <Input
                  className="font-mono text-sm"
                  value={bgColorEnd}
                  onChange={(e) => setBgColorEnd(e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          ) : null}
          <div
            className="rounded-xl border border-border/80 p-6 text-sm shadow-inner"
            style={{
              background: useGradient && bgColorEnd ? `linear-gradient(135deg, ${bgColor}, ${bgColorEnd})` : bgColor,
              color: textColor || undefined,
            }}
          >
            <p className="font-heading text-lg font-semibold">{heading}</p>
            <p className="mt-1 opacity-90">{subheading}</p>
            <p className="mt-2 text-xs opacity-80">Live preview (demo)</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit">Save CTA block (demo)</Button>
        {saved ? (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Stored in session only — connect to your CMS, headless WordPress, or database.
          </span>
        ) : null}
      </div>
    </form>
  );
}
