"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_ELIGIBILITY_SETTINGS, type EligibilitySettings } from "@/lib/eligibility/settings";

/**
 * Where each setting actually lives. The old page had six "Save (demo)"
 * buttons that saved nothing; every link here goes to a screen that does.
 */
const SETTINGS_LINKS: { href: string; title: string; description: string }[] = [
  { href: "/dashboard/admin/cms", title: "Site content", description: "Homepage hero, announcement banner, footer text, SEO and the Resources page intro." },
  { href: "/dashboard/admin/tax-documents", title: "Tax years and credit limits", description: "Individual credit limits per tax year, disclosures and the annual STO income reporting." },
  { href: "/dashboard/admin/scholarships/windows", title: "Application windows", description: "When each school year's scholarship applications open and close." },
  { href: "/dashboard/admin/scholarships/income-table", title: "Low-income table", description: "The 185% income limits by household size, per school year." },
  { href: "/dashboard/admin/scholarships/caps", title: "Scholarship caps", description: "Per-student limits on what is sent to the school, by fund, year and grade band." },
  { href: "/dashboard/admin/legal", title: "Legal pages", description: "Privacy policy, terms and communication policy." },
  { href: "/dashboard/admin/credentials", title: "API & credentials", description: "Which payment, email and SMS credentials are configured on the server." },
  { href: "/dashboard/admin/billing", title: "PayPal", description: "Checkout environment and webhook settings." },
];

export function AdminSettingsForm() {
  const [settings, setSettings] = useState<EligibilitySettings>(DEFAULT_ELIGIBILITY_SETTINGS);
  const [state, setState] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/eligibility-settings", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<EligibilitySettings>) : null))
      .then((data) => {
        if (!mounted) return;
        if (data) setSettings(data);
        setState("idle");
      })
      .catch(() => mounted && setState("idle"));
    return () => {
      mounted = false;
    };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");
    setError("");
    const res = await fetch("/api/admin/eligibility-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }).catch(() => null);
    if (!res?.ok) {
      setState("error");
      setError("Settings could not be saved. Try again.");
      return;
    }
    setSettings((await res.json()) as EligibilitySettings);
    setState("saved");
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Eligibility rules</CardTitle>
          <CardDescription>
            Used by the scholarship application, the student profile and the allocation tool. Changes take effect
            immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-5">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={settings.disabilityCarriesOver}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, disabilityCarriesOver: v === true }))}
              />
              <span>
                An approved disability verification carries into later school years.
                <span className="block text-xs text-muted-foreground">
                  Off means families re-document a disability each school year (the safer default until compliance
                  confirms). Displaced status always lasts all of K-12.
                </span>
              </span>
            </label>
            <div>
              <Label htmlFor="displaced-definition">Definition of a displaced student (shown to parents)</Label>
              <Textarea
                id="displaced-definition"
                className="mt-1.5 min-h-[110px]"
                value={settings.displacedDefinition}
                onChange={(e) => setSettings((s) => ({ ...s, displacedDefinition: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="income-proof">Accepted income proof (shown to parents)</Label>
              <Textarea
                id="income-proof"
                className="mt-1.5 min-h-[90px]"
                value={settings.incomeProofGuidance}
                onChange={(e) => setSettings((s) => ({ ...s, incomeProofGuidance: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <Button type="submit" disabled={state === "loading" || state === "saving"}>
                {state === "saving" ? "Saving…" : "Save eligibility rules"}
              </Button>
              {state === "saved" ? <span className="text-sm text-emerald-700 dark:text-emerald-400">Saved.</span> : null}
              {error ? (
                <span role="alert" className="text-sm text-destructive">
                  {error}
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {SETTINGS_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="group">
            <Card className="h-full border-border/80 transition-colors group-hover:border-primary/40">
              <CardHeader>
                <CardTitle className="font-heading text-base text-primary">{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
