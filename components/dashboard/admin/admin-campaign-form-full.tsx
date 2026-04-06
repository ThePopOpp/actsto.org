"use client";

import { useState } from "react";
import Link from "next/link";

import {
  CampaignFormPanelCampaign,
  CampaignFormPanelParent,
  CampaignFormPanelSchool,
  CampaignFormPanelStudent,
} from "@/components/campaigns/campaign-form-panels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Campaign } from "@/lib/campaigns";
import {
  type CampaignFormValues,
  formValuesToCampaign,
  slugifyCampaignSlug,
} from "@/lib/dashboard/campaign-editor";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "campaign", label: "Campaign" },
  { id: "parent", label: "Parent" },
  { id: "student", label: "Student" },
  { id: "school", label: "School" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminCampaignFormFull({
  mode,
  initial,
  previousCampaign,
  existingSlugs,
  onSave,
  onCancel,
}: {
  mode: "create" | "edit";
  initial: CampaignFormValues;
  previousCampaign?: Campaign;
  /** Slugs that are already taken (exclude current when editing). */
  existingSlugs: string[];
  onSave: (campaign: Campaign, oldSlug: string | null) => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<TabId>("campaign");
  const [values, setValues] = useState<CampaignFormValues>(initial);
  const [error, setError] = useState<string | null>(null);

  function onPatch(patch: Partial<CampaignFormValues>) {
    setValues((v) => ({ ...v, ...patch }));
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const resolvedSlug = slugifyCampaignSlug(values.slug, values.title);
    const taken = existingSlugs.some((s) => s === resolvedSlug);
    if (taken) {
      setError(`Slug “${resolvedSlug}” is already used. Choose another URL slug.`);
      return;
    }
    const built = formValuesToCampaign(values, previousCampaign);
    const oldSlug = mode === "edit" && previousCampaign ? previousCampaign.slug : null;
    onSave(built, oldSlug);
  }

  const previewSlug = slugifyCampaignSlug(values.slug, values.title);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {mode === "create" ? "Create campaign" : "Edit campaign"}
          </p>
          <h1 className="font-heading text-2xl font-semibold text-primary">
            {values.title.trim() || "New campaign"}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">/{previewSlug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Back to manager
          </Button>
          {previewSlug ? (
            <Link
              href={`/campaigns/${previewSlug}`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              target="_blank"
              rel="noreferrer"
            >
              View public page
            </Link>
          ) : null}
        </div>
      </div>

      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base text-primary">URL &amp; routing</CardTitle>
          <CardDescription>Slug becomes <span className="font-mono">/campaigns/[slug]</span>. Lowercase letters, numbers, and hyphens.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="admin-cf-slug">Slug</Label>
          <Input
            id="admin-cf-slug"
            className="mt-1.5 font-mono text-sm"
            value={values.slug}
            onChange={(e) => onPatch({ slug: e.target.value })}
            placeholder="my-family-campaign"
          />
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <form onSubmit={submit} className="space-y-6">
        <Card className="border-border/80">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="font-heading text-lg text-primary">Full campaign record</CardTitle>
            <CardDescription>
              All tabs match the public campaign creation flow. Fundraising totals and donor counts stay unchanged on
              edit unless you add an API later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              role="tablist"
              aria-label="Campaign sections"
              className="flex flex-wrap gap-1 border-b border-border"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={cn(
                    "relative -mb-px rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors",
                    tab === t.id
                      ? "border border-b-0 border-border bg-card text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    setTab(t.id);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="pt-1">
              {tab === "campaign" ? (
                <CampaignFormPanelCampaign values={values} onPatch={onPatch} />
              ) : null}
              {tab === "parent" ? <CampaignFormPanelParent values={values} onPatch={onPatch} /> : null}
              {tab === "student" ? <CampaignFormPanelStudent values={values} onPatch={onPatch} /> : null}
              {tab === "school" ? <CampaignFormPanelSchool values={values} onPatch={onPatch} /> : null}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit">{mode === "create" ? "Create campaign" : "Save changes"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
