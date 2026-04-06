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
import type { CampaignFormValues } from "@/lib/dashboard/campaign-editor";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "campaign", label: "Campaign" },
  { id: "parent", label: "Parent" },
  { id: "student", label: "Student" },
  { id: "school", label: "School" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CampaignEditorForm({
  basePath,
  initial,
}: {
  basePath: string;
  initial: CampaignFormValues;
}) {
  const b = basePath.replace(/\/$/, "");
  const [tab, setTab] = useState<TabId>("campaign");
  const [values, setValues] = useState<CampaignFormValues>(initial);
  const [saved, setSaved] = useState(false);

  function onPatch(patch: Partial<CampaignFormValues>) {
    setValues((v) => ({ ...v, ...patch }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">Edit campaign</p>
          <h1 className="font-heading text-2xl font-semibold text-primary">{values.title}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{values.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${b}/campaigns`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to campaigns
          </Link>
          <Link href={`/campaigns/${values.slug}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            View public page
          </Link>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card className="border-border/80">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="font-heading text-lg text-primary">Campaign details</CardTitle>
            <CardDescription>
              Same fields as campaign creation, organized in tabs. Changes are demo-only until your API is connected.
              Slug stays fixed for SEO and donor links.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              role="tablist"
              aria-label="Campaign edit sections"
              className="flex flex-wrap gap-1 border-b border-border"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  id={`tab-${t.id}`}
                  aria-controls={`panel-${t.id}`}
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
                <div role="tabpanel" id="panel-campaign" aria-labelledby="tab-campaign">
                  <CampaignFormPanelCampaign values={values} onPatch={onPatch} />
                </div>
              ) : null}
              {tab === "parent" ? (
                <div role="tabpanel" id="panel-parent" aria-labelledby="tab-parent">
                  <CampaignFormPanelParent values={values} onPatch={onPatch} />
                </div>
              ) : null}
              {tab === "student" ? (
                <div role="tabpanel" id="panel-student" aria-labelledby="tab-student">
                  <CampaignFormPanelStudent values={values} onPatch={onPatch} />
                </div>
              ) : null}
              {tab === "school" ? (
                <div role="tabpanel" id="panel-school" aria-labelledby="tab-school">
                  <CampaignFormPanelSchool values={values} onPatch={onPatch} />
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {saved ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Saved locally (demo). Production saves should validate moderation rules and notify reviewers.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Save changes</Button>
          <Button type="button" variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Preview (scroll top)
          </Button>
        </div>
      </form>
    </div>
  );
}
