"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  Megaphone,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

type Step = {
  title: string;
  body: string;
  /** A link that performs this step, rather than describing it. */
  action?: { href: string; label: string };
  /** Something worth knowing before moving on. */
  note?: string;
};

type Track = {
  id: TrackId;
  label: string;
  icon: typeof Users;
  headline: string;
  summary: string;
  steps: Step[];
};

type TrackId = "existing" | "new-campaign" | "one-campaign" | "remove";

const TRACKS: Track[] = [
  {
    id: "existing",
    label: "Add to a campaign you have",
    icon: UserPlus,
    headline: "Add another student to a campaign you already run",
    summary:
      "Fastest route when the campaign is already live or in draft. Takes about a minute, and does not touch anything you have already written.",
    steps: [
      {
        title: "Open Students",
        body:
          "In the parent dashboard sidebar, choose Students. This page lists every child on your account, whether or not they are on a campaign.",
        action: { href: "/dashboard/parent/students", label: "Open Students" },
      },
      {
        title: "Add the child if they are not listed yet",
        body:
          "Press Add a student and fill in their first name and grade. Last name and date of birth are optional — the date of birth is only needed later if you want to invite a student aged 16 or over to their own login.",
        note:
          "You do not need a campaign to add a student. Add all of your children first, then decide which campaigns they belong to.",
      },
      {
        title: "Find their card and look at Campaigns",
        body:
          "Each student card has a Campaigns section listing the campaigns they are already on, followed by a button for each campaign they are not on.",
      },
      {
        title: "Press “Add to …” for the campaign you want",
        body:
          "The student joins that campaign immediately. Their share of the goal is set to an even split of the campaign goal, which you can change next.",
        note:
          "The same child can be on more than one campaign at a time. They stay a single student record either way.",
      },
      {
        title: "Set their individual goal",
        body:
          "Open the campaign editor, go to the Student tab, and set Individual goal for each child. This is the amount shown on their card on the public campaign page.",
        action: { href: "/dashboard/parent/campaigns", label: "Open my campaigns" },
      },
      {
        title: "Save, and submit if it is still a draft",
        body:
          "Press Save changes. If the campaign has not been reviewed yet, press Submit for Review so an ACT administrator can publish it.",
      },
    ],
  },
  {
    id: "new-campaign",
    label: "Start a second campaign",
    icon: Megaphone,
    headline: "Give another child their own campaign",
    summary:
      "You can run more than one campaign at the same time — one per child is a common setup, and each gets its own page, goal and link to share.",
    steps: [
      {
        title: "Add every child on the Students page first",
        body:
          "Doing this before you start the campaign is what lets you pick them in the wizard instead of retyping their details.",
        action: { href: "/dashboard/parent/students", label: "Open Students" },
      },
      {
        title: "Start a new campaign",
        body:
          "Use Start another campaign on your Campaigns page, or go straight to campaign creation. Your existing campaigns are untouched.",
        action: { href: "/campaigns/new", label: "Start a campaign" },
      },
      {
        title: "Fill in Campaign and Parent Info",
        body:
          "Steps 1 and 2 cover the campaign title, story, goal, dates and your contact details. Your details are filled in from your profile.",
      },
      {
        title: "On step 3, pick the child from your account",
        body:
          "The Student step shows a panel headed “Students already on your account”. Press the child’s name to add them — their grade, school and photo carry over.",
        note:
          "Picking from that panel is what keeps one record per child. Typing them in again creates a second record for the same kid.",
      },
      {
        title: "Finish the School step and save",
        body:
          "Save Draft to come back later, or Submit for Review when everything is filled in. The campaign only goes public after an administrator approves it.",
      },
      {
        title: "Repeat for your next child",
        body:
          "Start another campaign and pick the next child. Both campaigns run side by side, and both appear on your Campaigns page.",
      },
    ],
  },
  {
    id: "one-campaign",
    label: "Several children, one campaign",
    icon: Users,
    headline: "Put more than one child on the same campaign",
    summary:
      "One family campaign that raises for two or three siblings together. Each child gets their own funding card and their own goal on the public page.",
    steps: [
      {
        title: "Open the campaign and go to the Student tab",
        body:
          "From Campaigns, press Edit campaign, then choose the Student tab. Everyone currently on the campaign is listed here.",
        action: { href: "/dashboard/parent/campaigns", label: "Open my campaigns" },
      },
      {
        title: "Add each child",
        body:
          "Pick them from “Students already on your account”, or press Add Another Student to enter someone new. Children added from your account are marked “On your account”.",
      },
      {
        title: "Split the goal between them",
        body:
          "Each child gets an even share of the campaign goal by default. Change Individual goal on any of them — the shares do not have to be equal, and they do not have to add up to the campaign goal.",
      },
      {
        title: "Save changes",
        body:
          "Press Save changes. The public campaign page now shows a funding card for each child, with their own progress.",
        note:
          "Removing a child here only takes them off this campaign. They stay on your account and on any other campaign they are part of.",
      },
    ],
  },
  {
    id: "remove",
    label: "Remove a student",
    icon: Trash2,
    headline: "Take a student off a campaign, or off your account",
    summary:
      "These are two different things. Removing from a campaign is always safe and reversible; removing from your account deletes the record.",
    steps: [
      {
        title: "To remove them from one campaign",
        body:
          "Students page → their card → Campaigns → Remove next to that campaign. They stay on your account and on every other campaign.",
        action: { href: "/dashboard/parent/students", label: "Open Students" },
      },
      {
        title: "Or remove them from inside the campaign editor",
        body:
          "Campaign editor → Student tab → Remove on that child’s block → Save changes. Same result, and useful while you are already editing.",
      },
      {
        title: "To remove them from your account entirely",
        body:
          "Students page → their card → Remove from account. This deletes the student record and takes them off every campaign at once.",
        note:
          "Donations already made to a campaign are never affected — they belong to the campaign, not the student record.",
      },
      {
        title: "If removal is blocked",
        body:
          "A student with donations directed to them, a donor recommendation, or a scholarship application or award cannot be deleted — those records have to be kept. You will see the reason on screen. Remove them from the campaign instead.",
      },
      {
        title: "If the same child appears twice",
        body:
          "Older campaigns created a separate record each time. When two records share a name, the Students page offers Merge duplicates: choose which record to keep, and every campaign moves onto it.",
      },
    ],
  },
];

function StepList({ track }: { track: Track }) {
  const [step, setStep] = useState(0);
  const current = track.steps[step];
  const isLast = step === track.steps.length - 1;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-heading text-lg font-semibold text-primary">{track.headline}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{track.summary}</p>
      </div>

      <ol className="flex flex-wrap gap-1.5" aria-label="Steps">
        {track.steps.map((s, index) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => setStep(index)}
              aria-current={index === step ? "step" : undefined}
              className={cn(
                "grid size-8 place-items-center rounded-full text-sm font-semibold transition-colors",
                index === step
                  ? "bg-primary text-primary-foreground"
                  : index < step
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {index < step ? <Check className="size-4" aria-hidden /> : index + 1}
              <span className="sr-only">
                Step {index + 1}: {s.title}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-border bg-card/70 p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Step {step + 1} of {track.steps.length}
        </p>
        <h4 className="mt-1 font-heading text-base font-semibold text-primary">{current.title}</h4>
        <p className="mt-2 text-sm text-foreground/90">{current.body}</p>

        {current.note ? (
          <p className="mt-3 flex gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{current.note}</span>
          </p>
        ) : null}

        {current.action ? (
          <Link
            href={current.action.href}
            className={cn(buttonVariants({ size: "sm" }), "mt-4 gap-1.5")}
          >
            {current.action.label}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {isLast ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setStep(0)}>
            Start over
          </Button>
        ) : (
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setStep((s) => s + 1)}>
            Next step
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Step-by-step walkthrough for managing students across campaigns.
 *
 * The underlying model — one student record, any number of campaigns — is not
 * something a parent can infer from the forms, so this spells out each route
 * and links straight to the page that performs the step.
 */
export function StudentHowToWizard({ initialTrack = "existing" }: { initialTrack?: TrackId }) {
  const [trackId, setTrackId] = useState<TrackId>(initialTrack);
  const track = TRACKS.find((t) => t.id === trackId) ?? TRACKS[0];

  return (
    <Card className="border-border/80">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="font-heading text-lg text-primary">Adding and removing students</CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Copy className="size-3" aria-hidden />
            One record per child
          </Badge>
        </div>
        <CardDescription>
          A student is saved once on your account and can join any number of campaigns. Pick what you
          are trying to do.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SegmentedTabs
          tabs={TRACKS.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
          value={trackId}
          onChange={setTrackId}
          ariaLabel="What do you want to do?"
        />
        {/* Remounting on track change resets the step counter to 1. */}
        <StepList key={track.id} track={track} />
      </CardContent>
    </Card>
  );
}
