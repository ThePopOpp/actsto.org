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
import { calculateCampaignCompletion } from "@/lib/campaigns/completion";
import type { CampaignFormValues } from "@/lib/dashboard/campaign-editor";
import { formValuesToCampaign } from "@/lib/dashboard/campaign-editor";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const REVIEWED_STATUSES = new Set(["pending_review", "approved", "active", "published"]);

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
  initialStatus,
}: {
  basePath: string;
  initial: CampaignFormValues;
  initialStatus?: string;
}) {
  const b = basePath.replace(/\/$/, "");
  const [tab, setTab] = useState<TabId>("campaign");
  const [values, setValues] = useState<CampaignFormValues>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | undefined>(initialStatus);

  const completion = calculateCampaignCompletion(values);
  const underReview = status ? REVIEWED_STATUSES.has(status) : false;

  function onPatch(patch: Partial<CampaignFormValues>) {
    setValues((v) => ({ ...v, ...patch }));
    setSaved(false);
    setError(null);
  }

  /** Persist current edits. Returns the saved slug (which may change) or null on failure. */
  async function saveChanges(): Promise<string | null> {
    const previous = formValuesToCampaign(initial);
    const campaign = formValuesToCampaign(values, previous);
    const res = await fetch(`/api/campaigns/${encodeURIComponent(initial.slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign }),
    });
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      campaign?: { slug?: string };
    } | null;
    if (!res.ok) throw new Error(data?.error ?? "Failed to save campaign.");
    return data?.campaign?.slug ?? initial.slug;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveChanges();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save campaign.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitForReview() {
    setIsSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      // Save the latest edits first so review sees the current content.
      const savedSlug = (await saveChanges()) ?? initial.slug;
      const res = await fetch(`/api/campaigns/${encodeURIComponent(savedSlug)}/submit`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        missingFields?: string[];
        status?: string;
      } | null;
      if (!res.ok) {
        const missing = data?.missingFields?.length ? ` Still needed: ${data.missingFields.join(", ")}.` : "";
        throw new Error(`${data?.error ?? "Could not submit for review."}${missing}`);
      }
      setStatus(data?.status ?? "pending_review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit for review.");
    } finally {
      setIsSubmitting(false);
    }
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
              Same fields as campaign creation, organized in tabs. Saved changes feed the public page, campaign cards,
              and dashboard views.
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
            Campaign saved.
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {underReview ? (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200">
            {status === "pending_review" ? (
              <p>
                <span className="font-medium">Submitted for review.</span> An ACT administrator will
                review your campaign and publish it once approved. You can still edit and save changes.
              </p>
            ) : (
              <p>
                <span className="font-medium">This campaign is live.</span> Edits you save here update
                the public page.
              </p>
            )}
          </div>
        ) : !completion.readyForReview ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-medium">Add these details to submit for review:</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {completion.missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Everything looks ready. Submit your campaign so an ACT administrator can review and
            publish it.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="outline" disabled={isSaving || isSubmitting}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
          {!underReview ? (
            <Button
              type="button"
              disabled={isSaving || isSubmitting}
              onClick={() => void submitForReview()}
              title={
                !completion.readyForReview
                  ? `Still needed: ${completion.missingFields.join(", ")}`
                  : undefined
              }
            >
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Preview (scroll top)
          </Button>
        </div>
      </form>
    </div>
  );
}
