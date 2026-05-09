"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type {
  SiteContentSection,
  SiteContentSettingsPayload,
} from "@/lib/admin/site-content-settings";
import { DEFAULT_SITE_CONTENT_SETTINGS } from "@/lib/admin/site-content-settings";
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

type SaveState = "idle" | "saving" | "saved" | "error";

const sectionLabels: Record<SiteContentSection, string> = {
  announcementBanner: "Announcement Banner",
  homepageHero: "Homepage Hero",
  seoSocial: "SEO & Social Previews",
  legalKeyPages: "Legal & Key Pages",
  footerTrust: "Footer & Trust Strip",
  resourcesBlog: "Resources & Blog",
  featuredNavigation: "Featured Navigation Highlight",
};

function SaveBar({
  section,
  state,
  error,
}: {
  section: SiteContentSection;
  state: SaveState;
  error?: string | null;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <Button type="submit" disabled={state === "saving"}>
        {state === "saving" ? "Saving..." : `Save ${sectionLabels[section]}`}
      </Button>
      {state === "saved" ? (
        <span className="text-sm text-emerald-600 dark:text-emerald-400">
          Saved to Site Content settings.
        </span>
      ) : null}
      {state === "error" ? (
        <span className="text-sm text-destructive">{error ?? "Could not save this section."}</span>
      ) : null}
    </div>
  );
}

export function AdminSiteContentForm() {
  const [settings, setSettings] = useState<SiteContentSettingsPayload>(DEFAULT_SITE_CONTENT_SETTINGS);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [saveStates, setSaveStates] = useState<Record<SiteContentSection, SaveState>>({
    announcementBanner: "idle",
    homepageHero: "idle",
    seoSocial: "idle",
    legalKeyPages: "idle",
    footerTrust: "idle",
    resourcesBlog: "idle",
    featuredNavigation: "idle",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadState("loading");
      const res = await fetch("/api/admin/site-content", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as {
        payload?: SiteContentSettingsPayload;
        error?: string;
      } | null;
      if (!mounted) return;
      if (!res.ok || !data?.payload) {
        setError(data?.error ?? "Could not load Site Content settings.");
        setLoadState("error");
        return;
      }
      setSettings(data.payload);
      setLoadState("ready");
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  function patchSection<T extends SiteContentSection>(
    section: T,
    values: Partial<SiteContentSettingsPayload[T]>,
  ) {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...values,
      },
    }));
    setSaveStates((current) => ({ ...current, [section]: "idle" }));
  }

  async function saveSection(section: SiteContentSection) {
    setSaveStates((current) => ({ ...current, [section]: "saving" }));
    setError(null);
    const res = await fetch("/api/admin/site-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, values: settings[section] }),
    });
    const data = (await res.json().catch(() => null)) as {
      payload?: SiteContentSettingsPayload;
      error?: string;
    } | null;
    if (!res.ok || !data?.payload) {
      setError(data?.error ?? "Could not save this section.");
      setSaveStates((current) => ({ ...current, [section]: "error" }));
      return;
    }
    setSettings(data.payload);
    setSaveStates((current) => ({ ...current, [section]: "saved" }));
    window.setTimeout(() => {
      setSaveStates((current) => (current[section] === "saved" ? { ...current, [section]: "idle" } : current));
    }, 2600);
  }

  const banner = settings.announcementBanner;
  const hero = settings.homepageHero;
  const seo = settings.seoSocial;
  const legal = settings.legalKeyPages;
  const footer = settings.footerTrust;
  const resources = settings.resourcesBlog;
  const nav = settings.featuredNavigation;

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-primary/25 bg-muted/15">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Site Content saves to Supabase through the admin API. Homepage Hero also updates the
          connected <strong className="text-foreground">home-hero-v1</strong> CTA block used on the
          live homepage. Maintenance mode and registration toggles live under{" "}
          <Link href="/dashboard/admin/settings" className="text-primary underline-offset-4 hover:underline">
            Settings
          </Link>
          .
        </CardContent>
      </Card>

      {loadState === "loading" ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">Loading Site Content settings...</CardContent>
        </Card>
      ) : null}
      {loadState === "error" ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Announcement Banner</CardTitle>
          <CardDescription>
            Dismissible strip above the header for tax deadlines, events, or policy updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveSection("announcementBanner");
            }}
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={banner.enabled}
                onCheckedChange={(value) => patchSection("announcementBanner", { enabled: value === true })}
              />
              Show banner site-wide
            </label>
            <div>
              <Label htmlFor="banner-text">Message</Label>
              <Textarea
                id="banner-text"
                className="mt-1.5 min-h-[72px]"
                value={banner.message}
                onChange={(event) => patchSection("announcementBanner", { message: event.target.value })}
                disabled={!banner.enabled}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="banner-href">Learn more link (path or URL)</Label>
                <Input
                  id="banner-href"
                  className="mt-1.5 font-mono text-sm"
                  value={banner.href}
                  onChange={(event) => patchSection("announcementBanner", { href: event.target.value })}
                  disabled={!banner.enabled}
                />
              </div>
              <div>
                <Label>Visual tone</Label>
                <Select
                  value={banner.tone}
                  onValueChange={(tone) => tone && patchSection("announcementBanner", { tone })}
                  disabled={!banner.enabled}
                >
                  <SelectTrigger className="mt-1.5 h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informational (sky)</SelectItem>
                    <SelectItem value="warning">Important (amber)</SelectItem>
                    <SelectItem value="urgent">Urgent (brand red)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SaveBar section="announcementBanner" state={saveStates.announcementBanner} error={error} />
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Homepage Hero</CardTitle>
          <CardDescription>
            Above-the-fold headline and CTAs. Saving also updates the live homepage CTA block.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveSection("homepageHero");
            }}
          >
            <div>
              <Label htmlFor="hero-head">Headline</Label>
              <Input
                id="hero-head"
                className="mt-1.5 text-base font-medium"
                value={hero.headline}
                onChange={(event) => patchSection("homepageHero", { headline: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="hero-sub">Supporting paragraph</Label>
              <Textarea
                id="hero-sub"
                className="mt-1.5 min-h-[88px]"
                value={hero.supportingText}
                onChange={(event) => patchSection("homepageHero", { supportingText: event.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cta1">Primary button label</Label>
                <Input
                  id="cta1"
                  className="mt-1.5"
                  value={hero.primaryLabel}
                  onChange={(event) => patchSection("homepageHero", { primaryLabel: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cta1href">Primary button URL</Label>
                <Input
                  id="cta1href"
                  className="mt-1.5 font-mono text-sm"
                  value={hero.primaryUrl}
                  onChange={(event) => patchSection("homepageHero", { primaryUrl: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cta2">Secondary button label</Label>
                <Input
                  id="cta2"
                  className="mt-1.5"
                  value={hero.secondaryLabel}
                  onChange={(event) => patchSection("homepageHero", { secondaryLabel: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cta2href">Secondary button URL</Label>
                <Input
                  id="cta2href"
                  className="mt-1.5 font-mono text-sm"
                  value={hero.secondaryUrl}
                  onChange={(event) => patchSection("homepageHero", { secondaryUrl: event.target.value })}
                />
              </div>
            </div>
            <SaveBar section="homepageHero" state={saveStates.homepageHero} error={error} />
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">SEO &amp; Social Previews</CardTitle>
          <CardDescription>Default tags when pages do not override metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveSection("seoSocial");
            }}
          >
            <div>
              <Label htmlFor="meta-title">Default document title (suffix)</Label>
              <Input
                id="meta-title"
                className="mt-1.5"
                value={seo.metaTitle}
                onChange={(event) => patchSection("seoSocial", { metaTitle: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="meta-desc">Default meta description</Label>
              <Textarea
                id="meta-desc"
                className="mt-1.5 min-h-[80px]"
                value={seo.metaDescription}
                onChange={(event) => patchSection("seoSocial", { metaDescription: event.target.value })}
                maxLength={320}
              />
              <p className="mt-1 text-xs text-muted-foreground">{seo.metaDescription.length} / ~160 recommended</p>
            </div>
            <div>
              <Label htmlFor="og-img">Default Open Graph image URL</Label>
              <Input
                id="og-img"
                className="mt-1.5 font-mono text-sm"
                value={seo.ogImage}
                onChange={(event) => patchSection("seoSocial", { ogImage: event.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="max-w-md">
              <Label htmlFor="tw">Twitter / X handle</Label>
              <Input
                id="tw"
                className="mt-1.5"
                value={seo.twitterHandle}
                onChange={(event) => patchSection("seoSocial", { twitterHandle: event.target.value })}
              />
            </div>
            <SaveBar section="seoSocial" state={saveStates.seoSocial} error={error} />
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Legal &amp; Key Pages</CardTitle>
          <CardDescription>Paths used for footer and checkout disclosures.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveSection("legalKeyPages");
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="path-privacy">Privacy policy</Label>
                <Input
                  id="path-privacy"
                  className="mt-1.5 font-mono text-sm"
                  value={legal.privacyPath}
                  onChange={(event) => patchSection("legalKeyPages", { privacyPath: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="path-terms">Terms of use</Label>
                <Input
                  id="path-terms"
                  className="mt-1.5 font-mono text-sm"
                  value={legal.termsPath}
                  onChange={(event) => patchSection("legalKeyPages", { termsPath: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="path-tax">Tax disclosure</Label>
                <Input
                  id="path-tax"
                  className="mt-1.5 font-mono text-sm"
                  value={legal.taxDisclosurePath}
                  onChange={(event) => patchSection("legalKeyPages", { taxDisclosurePath: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="path-contact">Contact / support</Label>
                <Input
                  id="path-contact"
                  className="mt-1.5 font-mono text-sm"
                  value={legal.contactPath}
                  onChange={(event) => patchSection("legalKeyPages", { contactPath: event.target.value })}
                />
              </div>
            </div>
            <SaveBar section="legalKeyPages" state={saveStates.legalKeyPages} error={error} />
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Footer &amp; Trust Strip</CardTitle>
          <CardDescription>Short compliance blurb and optional copyright line override.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveSection("footerTrust");
            }}
          >
            <div>
              <Label htmlFor="footer-note">Footer compliance / trust text</Label>
              <Textarea
                id="footer-note"
                className="mt-1.5 min-h-[88px]"
                value={footer.complianceText}
                onChange={(event) => patchSection("footerTrust", { complianceText: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="copy">Copyright line override (optional)</Label>
              <Input
                id="copy"
                className="mt-1.5"
                value={footer.copyrightOverride}
                onChange={(event) => patchSection("footerTrust", { copyrightOverride: event.target.value })}
              />
            </div>
            <SaveBar section="footerTrust" state={saveStates.footerTrust} error={error} />
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Resources &amp; Blog</CardTitle>
          <CardDescription>Intro copy for /resources and external blog link settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveSection("resourcesBlog");
            }}
          >
            <div>
              <Label htmlFor="res-intro">Resources page intro</Label>
              <Textarea
                id="res-intro"
                className="mt-1.5 min-h-[80px]"
                value={resources.intro}
                onChange={(event) => patchSection("resourcesBlog", { intro: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="blog">External blog base URL</Label>
              <Input
                id="blog"
                className="mt-1.5 font-mono text-sm"
                value={resources.blogUrl}
                onChange={(event) => patchSection("resourcesBlog", { blogUrl: event.target.value })}
              />
            </div>
            <SaveBar section="resourcesBlog" state={saveStates.resourcesBlog} error={error} />
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Featured Navigation Highlight</CardTitle>
          <CardDescription>Optional spotlight in Explore / Resources mega column.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveSection("featuredNavigation");
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="mega-label">Title</Label>
                <Input
                  id="mega-label"
                  className="mt-1.5"
                  value={nav.label}
                  onChange={(event) => patchSection("featuredNavigation", { label: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mega-href">Link</Label>
                <Input
                  id="mega-href"
                  className="mt-1.5 font-mono text-sm"
                  value={nav.href}
                  onChange={(event) => patchSection("featuredNavigation", { href: event.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mega-desc">Short description</Label>
              <Input
                id="mega-desc"
                className="mt-1.5"
                value={nav.description}
                onChange={(event) => patchSection("featuredNavigation", { description: event.target.value })}
              />
            </div>
            <SaveBar section="featuredNavigation" state={saveStates.featuredNavigation} error={error} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
