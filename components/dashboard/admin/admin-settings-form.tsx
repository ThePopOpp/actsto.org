"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  GENERAL_EMAIL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  TEAM_PHONE_DISPLAY,
} from "@/lib/constants";

function SaveBar({ formId, saved }: { formId: string; saved: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <Button type="submit" form={formId}>
        Save (demo)
      </Button>
      {saved ? (
        <span className="text-sm text-emerald-600 dark:text-emerald-400">
          Saved locally — persist via env or database in production.
        </span>
      ) : null}
    </div>
  );
}

export function AdminSettingsForm() {
  const [siteName, setSiteName] = useState("Arizona Christian Tuition");
  const [publicUrl, setPublicUrl] = useState("https://arizonachristiantuition.com");
  const [generalEmail, setGeneralEmail] = useState(GENERAL_EMAIL);
  const [supportEmail, setSupportEmail] = useState(SUPPORT_EMAIL);
  const [teamPhone, setTeamPhone] = useState(TEAM_PHONE_DISPLAY);
  const [supportPhone, setSupportPhone] = useState(SUPPORT_PHONE_DISPLAY);
  const [logoUrl, setLogoUrl] = useState("");
  const [savedBranding, setSavedBranding] = useState(false);

  const [taxYear, setTaxYear] = useState("2026");
  const [showLimitsOnSite, setShowLimitsOnSite] = useState(true);
  const [disclaimer, setDisclaimer] = useState(
    "Arizona Christian Tuition is a certified School Tuition Organization (STO). Donations may qualify for Arizona tax credits; consult your tax advisor. Designations are recommendations only."
  );
  const [savedTax, setSavedTax] = useState(false);

  const [defaultGoal, setDefaultGoal] = useState("15000");
  const [defaultDurationDays, setDefaultDurationDays] = useState("90");
  const [requireApproval, setRequireApproval] = useState(true);
  const [savedCampaigns, setSavedCampaigns] = useState(false);

  const [primaryDomain, setPrimaryDomain] = useState("arizonachristiantuition.com");
  const [stagingDomain, setStagingDomain] = useState("");
  const [allowPreviewDeploys, setAllowPreviewDeploys] = useState(false);
  const [savedDomains, setSavedDomains] = useState(false);

  const [ga4Id, setGa4Id] = useState("");
  const [plausibleDomain, setPlausibleDomain] = useState("");
  const [analyticsProdOnly, setAnalyticsProdOnly] = useState(true);
  const [savedAnalytics, setSavedAnalytics] = useState(false);

  const [regOpen, setRegOpen] = useState(true);
  const [campaignsOpen, setCampaignsOpen] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savedFlags, setSavedFlags] = useState(false);

  function flash(setter: (v: boolean) => void) {
    setter(true);
    window.setTimeout(() => setter(false), 2200);
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-primary/25 bg-muted/15">
        <CardContent className="p-4 text-sm text-muted-foreground">
          For <strong className="text-foreground">secrets and API keys</strong>, use{" "}
          <Link href="/dashboard/admin/credentials" className="text-primary underline-offset-4 hover:underline">
            API & credentials
          </Link>
          . This page is for public-facing copy, defaults, and feature switches.
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Site &amp; branding</CardTitle>
          <CardDescription>
            Contact points and assets shown across the marketing site and transactional emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-branding"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedBranding);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="site-name">Organization / site name</Label>
                <Input
                  id="site-name"
                  className="mt-1.5"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="public-url">Public site URL (no trailing slash)</Label>
                <Input
                  id="public-url"
                  className="mt-1.5 font-mono text-sm"
                  value={publicUrl}
                  onChange={(e) => setPublicUrl(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="gen-email">General / hello email</Label>
                <Input
                  id="gen-email"
                  type="email"
                  className="mt-1.5"
                  value={generalEmail}
                  onChange={(e) => setGeneralEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sup-email">Support email</Label>
                <Input
                  id="sup-email"
                  type="email"
                  className="mt-1.5"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="team-ph">ACT team phone (display)</Label>
                <Input
                  id="team-ph"
                  className="mt-1.5"
                  value={teamPhone}
                  onChange={(e) => setTeamPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="support-ph">Listed support phone</Label>
                <Input
                  id="support-ph"
                  className="mt-1.5"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="logo">Primary logo URL (optional override)</Label>
                <Input
                  id="logo"
                  className="mt-1.5 font-mono text-sm"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
          </form>
          <SaveBar formId="form-branding" saved={savedBranding} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Tax year &amp; compliance copy</CardTitle>
          <CardDescription>
            Drives homepage and “How it works” maxima labels; keep in sync with ADOR guidance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-tax"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedTax);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tax-year">Displayed tax year</Label>
                <Input
                  id="tax-year"
                  className="mt-1.5"
                  value={taxYear}
                  onChange={(e) => setTaxYear(e.target.value)}
                  placeholder="2026"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={showLimitsOnSite}
                    onCheckedChange={(v) => setShowLimitsOnSite(v === true)}
                  />
                  Show annual credit maximums on marketing pages
                </label>
              </div>
            </div>
            <div>
              <Label htmlFor="disclaimer">Short legal / disclaimer block (site footer &amp; donations)</Label>
              <Textarea
                id="disclaimer"
                className="mt-1.5 min-h-[100px]"
                value={disclaimer}
                onChange={(e) => setDisclaimer(e.target.value)}
              />
            </div>
          </form>
          <SaveBar formId="form-tax" saved={savedTax} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Campaign defaults</CardTitle>
          <CardDescription>
            New campaign suggestions; families can still edit before submit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-campaign-def"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedCampaigns);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="def-goal">Suggested goal ($)</Label>
                <Input
                  id="def-goal"
                  type="number"
                  min={0}
                  className="mt-1.5"
                  value={defaultGoal}
                  onChange={(e) => setDefaultGoal(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="def-days">Suggested duration (days)</Label>
                <Input
                  id="def-days"
                  type="number"
                  min={1}
                  className="mt-1.5"
                  value={defaultDurationDays}
                  onChange={(e) => setDefaultDurationDays(e.target.value)}
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={requireApproval} onCheckedChange={(v) => setRequireApproval(v === true)} />
              Require admin approval before campaigns go live
            </label>
          </form>
          <SaveBar formId="form-campaign-def" saved={savedCampaigns} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Domains</CardTitle>
          <CardDescription>
            Canonical host for links and cookie scope; staging used for internal QA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-domains"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedDomains);
            }}
          >
            <div>
              <Label htmlFor="primary-dom">Primary production domain</Label>
              <Input
                id="primary-dom"
                className="mt-1.5 font-mono text-sm"
                value={primaryDomain}
                onChange={(e) => setPrimaryDomain(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="staging-dom">Staging domain (optional)</Label>
              <Input
                id="staging-dom"
                className="mt-1.5 font-mono text-sm"
                value={stagingDomain}
                onChange={(e) => setStagingDomain(e.target.value)}
                placeholder="staging.example.com"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={allowPreviewDeploys}
                onCheckedChange={(v) => setAllowPreviewDeploys(v === true)}
              />
              Allow Vercel preview URLs to bypass maintenance (staff only)
            </label>
          </form>
          <SaveBar formId="form-domains" saved={savedDomains} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Analytics</CardTitle>
          <CardDescription>
            Privacy-conscious defaults; load tags only when users have not opted out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-analytics"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedAnalytics);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ga4">Google Analytics 4 measurement ID</Label>
                <Input
                  id="ga4"
                  className="mt-1.5 font-mono text-sm"
                  value={ga4Id}
                  onChange={(e) => setGa4Id(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
              <div>
                <Label htmlFor="plausible">Plausible domain (self-hosted or cloud)</Label>
                <Input
                  id="plausible"
                  className="mt-1.5 font-mono text-sm"
                  value={plausibleDomain}
                  onChange={(e) => setPlausibleDomain(e.target.value)}
                  placeholder="arizonachristiantuition.com"
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={analyticsProdOnly} onCheckedChange={(v) => setAnalyticsProdOnly(v === true)} />
              Fire analytics only on production hostname
            </label>
          </form>
          <SaveBar formId="form-analytics" saved={savedAnalytics} />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Feature flags</CardTitle>
          <CardDescription>
            Kill switches without redeploying — wire to your flags service later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="form-flags"
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              flash(setSavedFlags);
            }}
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={regOpen} onCheckedChange={(v) => setRegOpen(v === true)} />
              New user registration open
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={campaignsOpen} onCheckedChange={(v) => setCampaignsOpen(v === true)} />
              New campaign creation open
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={maintenanceMode} onCheckedChange={(v) => setMaintenanceMode(v === true)} />
              Maintenance mode (show banner; block donations &amp; sign-up)
            </label>
          </form>
          <SaveBar formId="form-flags" saved={savedFlags} />
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="font-heading text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Destructive or legally sensitive actions — require re-authentication in production.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Export organization data</p>
              <p className="text-sm text-muted-foreground">
                JSON/ZIP bundle: users, campaigns, donations metadata (demo only).
              </p>
            </div>
            <Button type="button" variant="outline">
              Request export (demo)
            </Button>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Privacy / erasure queue</p>
              <p className="text-sm text-muted-foreground">
                Track GDPR-style deletion requests; notify accounting before purging tax records.
              </p>
            </div>
            <Button type="button" variant="destructive">
              Log erasure request (demo)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
