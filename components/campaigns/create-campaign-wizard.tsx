"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import {
  CampaignFormPanelCampaign,
  CampaignFormPanelParent,
  CampaignFormPanelSchool,
  CampaignFormPanelStudent,
} from "@/components/campaigns/campaign-form-panels";
import { Button } from "@/components/ui/button";
import { calculateCampaignCompletion } from "@/lib/campaigns/completion";
import { ACT_LOGO_ROUND } from "@/lib/constants";
import type { CampaignFormValues } from "@/lib/dashboard/campaign-editor";
import { emptyCampaignFormValues } from "@/lib/dashboard/campaign-editor";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Campaign" },
  { n: 2, label: "Parent Info" },
  { n: 3, label: "Student" },
  { n: 4, label: "School" },
] as const;

export function CreateCampaignWizard({
  initialValues,
}: {
  initialValues?: Partial<CampaignFormValues>;
}) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<CampaignFormValues>(() => ({
    ...emptyCampaignFormValues(),
    ...initialValues,
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<"draft" | "review" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completion = calculateCampaignCompletion(values);

  function onPatch(patch: Partial<CampaignFormValues>) {
    setValues((v) => ({ ...v, ...patch }));
    setError(null);
  }

  async function saveCampaign(action: "draft" | "review") {
    setIsSaving(true);
    setSavingAction(action);
    setError(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, action }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        missingFields?: string[];
        redirect?: string;
      } | null;
      if (!res.ok || !data?.redirect) {
        const missing = data?.missingFields?.length ? ` Missing: ${data.missingFields.join(", ")}.` : "";
        throw new Error(`${data?.error ?? "Could not save this campaign."}${missing}`);
      }
      window.location.href = data.redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this campaign.");
    } finally {
      setIsSaving(false);
      setSavingAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-10 flex justify-center">
        <Image src={ACT_LOGO_ROUND} alt="" width={72} height={72} className="rounded-full" />
      </div>

      <div className="mb-10 grid grid-cols-4 gap-x-0">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex min-w-0 flex-col items-center gap-2">
            <div className="flex w-full min-w-0 items-center">
              <div
                className={cn(
                  "h-px min-w-0 flex-1",
                  i === 0 ? "bg-transparent" : step >= s.n ? "bg-primary" : "bg-border",
                )}
                aria-hidden
              />
              <button
                type="button"
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  step < s.n ? "bg-act-banner text-act-banner-foreground" : "bg-primary text-primary-foreground",
                )}
                onClick={() => setStep(s.n)}
                aria-label={`Go to step ${s.n}: ${s.label}`}
                aria-current={step === s.n ? "step" : undefined}
              >
                {s.n}
              </button>
              <div
                className={cn(
                  "h-px min-w-0 flex-1",
                  i === STEPS.length - 1 ? "bg-transparent" : step > s.n ? "bg-primary" : "bg-border",
                )}
                aria-hidden
              />
            </div>
            <span
              className={cn(
                "max-w-full px-0.5 text-center text-xs leading-tight font-medium text-muted-foreground sm:text-sm",
                step === s.n && "font-semibold text-primary",
              )}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card/80 p-4 text-sm text-muted-foreground">
        <p>
          You can save a draft at any point and finish later from your dashboard. Campaigns are not posted publicly
          until they are submitted and approved.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${completion.percent}%` }} />
          </div>
          <span className="shrink-0 font-medium text-primary">{completion.percent}% complete</span>
        </div>
      </div>

      <div className="space-y-5">
        {step === 1 ? <CampaignFormPanelCampaign values={values} onPatch={onPatch} /> : null}
        {step === 2 ? <CampaignFormPanelParent values={values} onPatch={onPatch} /> : null}
        {step === 3 ? (
          <CampaignFormPanelStudent
            values={values}
            onPatch={onPatch}
            onSkip={() => setStep(4)}
          />
        ) : null}
        {step === 4 ? <CampaignFormPanelSchool values={values} onPatch={onPatch} /> : null}

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-between gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={step <= 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Back
          </Button>
          {step < 4 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => void saveCampaign("draft")}
              >
                {savingAction === "draft" ? "Saving..." : "Save Draft"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setStep((s) => Math.min(4, s + 1))}>
                Next
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={isSaving} onClick={() => void saveCampaign("draft")}>
                {savingAction === "draft" ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                type="button"
                disabled={isSaving || !completion.readyForReview}
                onClick={() => void saveCampaign("review")}
                title={!completion.readyForReview ? `Missing: ${completion.missingFields.join(", ")}` : undefined}
              >
                {savingAction === "review" ? "Submitting..." : "Submit for Review"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-10 text-center">
        <Link
          href="/register"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to account types
        </Link>
      </p>
    </div>
  );
}
