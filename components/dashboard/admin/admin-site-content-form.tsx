"use client";

import { useState } from "react";
import Link from "next/link";

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

function SaveBar({ formId, saved }: { formId: string; saved: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <Button type="submit" form={formId}>
        Save (demo)
      </Button>
      {saved ? (
        <span className="text-sm text-emerald-600 dark:text-emerald-400">
          Saved locally — wire to CMS, JSON, or database-backed page builder.
        </span>
      ) : null}
    </div>
  );
}

export function AdminSiteContentForm() {
  const [bannerOn, setBannerOn] = useState(false);
  const [bannerText, setBannerText] = useState(
    "Tax credit limits updated for 2026 — see How It Works for the latest figures."
  );
  const [bannerHref, setBannerHref] = useState("/how-it-works");
  const [bannerTone, setBannerTone] = useState("info");
  const [savedBanner, setSavedBanner] = useState(false);

  const [heroHeadline, setHeroHeadline] = useState("Turn Your Taxes Into Private Christian Education");
  const [heroSub, setHeroSub] = useState(
    "Arizona’s tuition tax credit program lets you redirect state dollars to scholarships — at no net cost when you give up to your limit."
  );
  const [heroCtaPrimary, setHeroCtaPrimary] = useState("Donate Today");
  const [heroCtaPrimaryHref, setHeroCtaPrimaryHref] = useState("/campaigns");
  const [heroCtaSecondary, setHeroCtaSecondary] = useState("Start a Campaign");
  const [heroCtaSecondaryHref, setHeroCtaSecondaryHref] = useState("/campaigns/new");
  const [savedHero, setSavedHero] = useState(false);

  const [metaTitle, setMetaTitle] = useState("Arizona Christian Tuition");
  const [metaDescription, setMetaDescription] = useState(
    "Support Arizona families with private Christian schooling through tax-credit eligible giving. Browse campaigns and give in minutes."
  );
  const [ogImage, setOgImage] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("@arizonachristiantuition");
  const [savedSeo, setSavedSeo] = useState(false);

  const [pathPrivacy, setPathPrivacy] = useState("/legal/privacy");
  const [pathTerms, setPathTerms] = useState("/legal/terms");
  const [pathTax, setPathTax] = useState("/legal/terms/tax-disclosure");
  const [pathContact, setPathContact] = useState("/contact");
  const [savedLegal, setSavedLegal] = useState(false);

  const [footerNote, setFooterNote] = useState(
    "Arizona Christian Tuition is a certified School Tuition Organization (STO). Donations may qualify for Arizona tax credits."
  );
  const [copyrightOverride, setCopyrightOverride] = useState("");
  const [savedFooter, setSavedFooter] = useState(false);

  const [resourcesIntro, setResourcesIntro] = useState(
    "Guides for families, donors, and schools — tax credits, campaigns, and compliance basics."
  );
  const [blogUrl, setBlogUrl] = useState("https://arizonachristiantuition.com/blog/");
  const [savedResources, setSavedResources] = useState(false);

  const [megaFeaturedLabel, setMegaFeaturedLabel] = useState("ACT Support");
  const [megaFeaturedHref, setMegaFeaturedHref] = useState("/contact");
  const [megaFeaturedDesc, setMegaFeaturedDesc] = useState("Call, email, or book time with our team.");
  const [savedNav, setSavedNav] = useState(false);

  function flash(setter: (v: boolean) => void) {
    setter(true);
    window.setTimeout(() => setter(false), 2200);
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-primary/25 bg-muted/15">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Primary navigation labels are still defined in code (
          <code className="rounded bg-muted px-1 text-xs">site-header.tsx</code>
          ). Use the <strong className="text-foreground">featured link</strong> block below for a
          marketing-controlled highlight. Maintenance mode and registration toggles live under{" "}
          <Link href="/dashboard/admin/settings" className="text-primary underline-offset-4 hover:underline">
            Settings
          </Link>
          .
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Announcement banner</CardTitle>
          <CardDescription>
            Dismissible strip above the header — tax deadlines, events, or policy updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-cms-banner"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedBanner);
            }}
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={bannerOn} onCheckedChange={(v) => setBannerOn(v === true)} />
              Show banner site-wide
            </label>
            <div>
              <Label htmlFor="banner-text">Message</Label>
              <Textarea
                id="banner-text"
                className="mt-1.5 min-h-[72px]"
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                disabled={!bannerOn}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="banner-href">Learn more link (path or URL)</Label>
                <Input
                  id="banner-href"
                  className="mt-1.5 font-mono text-sm"
                  value={bannerHref}
                  onChange={(e) => setBannerHref(e.target.value)}
                  disabled={!bannerOn}
                />
              </div>
              <div>
                <Label htmlFor="banner-tone">Visual tone</Label>
                <Select value={bannerTone} onValueChange={(v) => setBannerTone(v ?? "info")}>
                  <SelectTrigger id="banner-tone" className="mt-1.5 h-10 w-full" disabled={!bannerOn}>
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
          </form>
          <SaveBar formId="form-cms-banner" saved={savedBanner} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Homepage hero</CardTitle>
          <CardDescription>
            Above-the-fold headline and CTAs. Should align with your latest fundraising positioning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-cms-hero"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedHero);
            }}
          >
            <div>
              <Label htmlFor="hero-head">Headline</Label>
              <Input
                id="hero-head"
                className="mt-1.5 text-base font-medium"
                value={heroHeadline}
                onChange={(e) => setHeroHeadline(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="hero-sub">Supporting paragraph</Label>
              <Textarea
                id="hero-sub"
                className="mt-1.5 min-h-[88px]"
                value={heroSub}
                onChange={(e) => setHeroSub(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cta1">Primary button label</Label>
                <Input
                  id="cta1"
                  className="mt-1.5"
                  value={heroCtaPrimary}
                  onChange={(e) => setHeroCtaPrimary(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cta1href">Primary button URL</Label>
                <Input
                  id="cta1href"
                  className="mt-1.5 font-mono text-sm"
                  value={heroCtaPrimaryHref}
                  onChange={(e) => setHeroCtaPrimaryHref(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cta2">Secondary button label</Label>
                <Input
                  id="cta2"
                  className="mt-1.5"
                  value={heroCtaSecondary}
                  onChange={(e) => setHeroCtaSecondary(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cta2href">Secondary button URL</Label>
                <Input
                  id="cta2href"
                  className="mt-1.5 font-mono text-sm"
                  value={heroCtaSecondaryHref}
                  onChange={(e) => setHeroCtaSecondaryHref(e.target.value)}
                />
              </div>
            </div>
          </form>
          <SaveBar formId="form-cms-hero" saved={savedHero} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">SEO &amp; social previews</CardTitle>
          <CardDescription>
            Default tags when pages do not override metadata. OG image should be 1200×630 or larger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-cms-seo"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedSeo);
            }}
          >
            <div>
              <Label htmlFor="meta-title">Default document title (suffix)</Label>
              <Input
                id="meta-title"
                className="mt-1.5"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Shown as “Page · Arizona Christian Tuition”"
              />
            </div>
            <div>
              <Label htmlFor="meta-desc">Default meta description</Label>
              <Textarea
                id="meta-desc"
                className="mt-1.5 min-h-[80px]"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                maxLength={320}
              />
              <p className="mt-1 text-xs text-muted-foreground">{metaDescription.length} / ~160 recommended</p>
            </div>
            <div>
              <Label htmlFor="og-img">Default Open Graph image URL</Label>
              <Input
                id="og-img"
                className="mt-1.5 font-mono text-sm"
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="max-w-md">
              <Label htmlFor="tw">Twitter / X handle</Label>
              <Input
                id="tw"
                className="mt-1.5"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
              />
            </div>
          </form>
          <SaveBar formId="form-cms-seo" saved={savedSeo} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Legal &amp; key pages</CardTitle>
          <CardDescription>
            Paths served by this app or external policy hosts. Used for footer and checkout disclosures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-cms-legal"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedLegal);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="path-privacy">Privacy policy</Label>
                <Input
                  id="path-privacy"
                  className="mt-1.5 font-mono text-sm"
                  value={pathPrivacy}
                  onChange={(e) => setPathPrivacy(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="path-terms">Terms of use</Label>
                <Input
                  id="path-terms"
                  className="mt-1.5 font-mono text-sm"
                  value={pathTerms}
                  onChange={(e) => setPathTerms(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="path-tax">Tax disclosure</Label>
                <Input
                  id="path-tax"
                  className="mt-1.5 font-mono text-sm"
                  value={pathTax}
                  onChange={(e) => setPathTax(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="path-contact">Contact / support</Label>
                <Input
                  id="path-contact"
                  className="mt-1.5 font-mono text-sm"
                  value={pathContact}
                  onChange={(e) => setPathContact(e.target.value)}
                />
              </div>
            </div>
          </form>
          <SaveBar formId="form-cms-legal" saved={savedLegal} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Footer &amp; trust strip</CardTitle>
          <CardDescription>
            Short compliance blurb and optional copyright line override.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-cms-footer"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedFooter);
            }}
          >
            <div>
              <Label htmlFor="footer-note">Footer compliance / trust text</Label>
              <Textarea
                id="footer-note"
                className="mt-1.5 min-h-[88px]"
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="copy">Copyright line override (optional)</Label>
              <Input
                id="copy"
                className="mt-1.5"
                value={copyrightOverride}
                onChange={(e) => setCopyrightOverride(e.target.value)}
                placeholder="Defaults to current year + site name if empty"
              />
            </div>
          </form>
          <SaveBar formId="form-cms-footer" saved={savedFooter} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Resources &amp; blog</CardTitle>
          <CardDescription>
            Intro copy for /resources and link-out to WordPress or another blog.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-cms-resources"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedResources);
            }}
          >
            <div>
              <Label htmlFor="res-intro">Resources page intro</Label>
              <Textarea
                id="res-intro"
                className="mt-1.5 min-h-[80px]"
                value={resourcesIntro}
                onChange={(e) => setResourcesIntro(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="blog">External blog base URL</Label>
              <Input
                id="blog"
                className="mt-1.5 font-mono text-sm"
                value={blogUrl}
                onChange={(e) => setBlogUrl(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                “Blog” in the nav can open this link in a new tab when wired.
              </p>
            </div>
          </form>
          <SaveBar formId="form-cms-resources" saved={savedResources} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Featured navigation highlight</CardTitle>
          <CardDescription>
            Optional spotlight in Explore / Resources mega column — e.g. support or registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-cms-nav"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedNav);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="mega-label">Title</Label>
                <Input
                  id="mega-label"
                  className="mt-1.5"
                  value={megaFeaturedLabel}
                  onChange={(e) => setMegaFeaturedLabel(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mega-href">Link</Label>
                <Input
                  id="mega-href"
                  className="mt-1.5 font-mono text-sm"
                  value={megaFeaturedHref}
                  onChange={(e) => setMegaFeaturedHref(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mega-desc">Short description</Label>
              <Input
                id="mega-desc"
                className="mt-1.5"
                value={megaFeaturedDesc}
                onChange={(e) => setMegaFeaturedDesc(e.target.value)}
              />
            </div>
          </form>
          <SaveBar formId="form-cms-nav" saved={savedNav} />
        </CardContent>
      </Card>
    </div>
  );
}
