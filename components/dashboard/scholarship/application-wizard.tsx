"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Loader2,
  Lock,
} from "lucide-react";

import { ApplicationReviewStep } from "@/components/dashboard/scholarship/steps/review-step";
import { EsaStep } from "@/components/dashboard/scholarship/steps/esa-step";
import { FamilyStep } from "@/components/dashboard/scholarship/steps/family-step";
import { FinancialStep } from "@/components/dashboard/scholarship/steps/financial-step";
import { NarrativeStep } from "@/components/dashboard/scholarship/steps/narrative-step";
import { OverflowStep } from "@/components/dashboard/scholarship/steps/overflow-step";
import type { WizardData } from "@/components/dashboard/scholarship/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  APPLICATION_STEPS,
  COPY,
  isStepId,
  STEP_IDS,
  type ApplicationStepId,
} from "@/lib/scholarship/constants";
import { validateApplication, type ValidationIssue } from "@/lib/scholarship/validation";
import type { HouseholdMemberView } from "@/lib/scholarship/income";
import { cn } from "@/lib/utils";

/**
 * The six-step application wizard.
 *
 * Three things it promises the parent, and therefore has to actually do:
 *   - "Your answers save as you go" — debounced writes, flushed on every step
 *     change and on unload, with a save state that never claims success it
 *     didn't get.
 *   - Back, forward and refresh behave — the active step lives in the URL.
 *   - Nothing is lost. A locked application still shows every value.
 */

export type WizardValues = {
  studentId: string;
  schoolYear: string;
  schoolId: string;
  grade: string;
  tuitionAfterDiscounts: string;
  narrative: string;
  overflowQualification: string;
  overflowOrg: string;
  overflowComments: string;
  esaCurrentYear: string;
  esaPriorYear: string;
};

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; at: string }
  | { status: "error"; message: string };

const AUTOSAVE_DELAY_MS = 800;

export function ApplicationWizard({ data }: { data: WizardData }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [values, setValues] = useState<WizardValues>(() => ({
    studentId: data.application.studentId,
    schoolYear: data.application.schoolYear ?? "",
    schoolId: data.application.schoolId ?? "",
    grade: data.application.grade ?? "",
    tuitionAfterDiscounts:
      data.application.tuitionAfterDiscounts === null
        ? ""
        : String(data.application.tuitionAfterDiscounts),
    narrative: data.application.narrative,
    overflowQualification: data.application.overflowQualification,
    overflowOrg: data.application.overflowOrg ?? "",
    overflowComments: data.application.overflowComments ?? "",
    esaCurrentYear: data.application.esaCurrentYear ?? "",
    esaPriorYear: data.application.esaPriorYear ?? "",
  }));

  const [household, setHousehold] = useState<HouseholdMemberView[]>(data.household);
  const [incomeConfirmedAt, setIncomeConfirmedAt] = useState<string | null>(
    data.application.incomeConfirmedAt,
  );
  const [documents, setDocuments] = useState(data.application.documents);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [showErrors, setShowErrors] = useState(false);

  const stepParam = searchParams.get("step");
  const step: ApplicationStepId = isStepId(stepParam) ? stepParam : "family";
  const stepPosition = STEP_IDS.indexOf(step);

  // ── Writable scope ─────────────────────────────────────────────────────────
  // Mirrors lib/scholarship/scope.ts. The server is the enforcement; this is
  // what stops the parent typing into a field that will be rejected.
  const reopenedSections = useMemo(
    () => data.application.fieldsRequested.filter(isStepId),
    [data.application.fieldsRequested],
  );
  // A lapsed deadline leaves the sections open to a late reply, so it is not a
  // lock even though the application has gone back to staff.
  const lateReplyOpen = data.application.infoNotReceived && reopenedSections.length > 0;
  const locked =
    Boolean(data.application.lockedAt) &&
    data.application.status !== "needs_info" &&
    !lateReplyOpen;
  const partialReopen =
    (data.application.status === "needs_info" || lateReplyOpen) && reopenedSections.length > 0;

  const canEditSection = useCallback(
    (section: ApplicationStepId) => {
      if (locked) return false;
      if (partialReopen) return reopenedSections.includes(section);
      return true;
    },
    [locked, partialReopen, reopenedSections],
  );

  // ── Autosave ───────────────────────────────────────────────────────────────
  const pending = useRef<Partial<WizardValues>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(
    async (opts?: { keepalive?: boolean }) => {
      const patch = pending.current;
      if (Object.keys(patch).length === 0) return true;
      pending.current = {};
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }

      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        if (key === "tuitionAfterDiscounts") {
          payload[key] = value === "" ? null : value;
        } else if (key === "schoolId" || key === "grade") {
          payload[key] = value === "" ? null : value;
        } else {
          payload[key] = value;
        }
      }

      setSaveState({ status: "saving" });
      try {
        const res = await fetch(`/api/scholarship/applications/${data.application.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: opts?.keepalive,
        });
        const body = (await res.json().catch(() => null)) as
          | { savedAt?: string; incomeConfirmedAt?: string | null; error?: string }
          | null;
        if (!res.ok) throw new Error(body?.error ?? "Could not save your answers.");

        setSaveState({ status: "saved", at: body?.savedAt ?? new Date().toISOString() });
        // Another tab may have changed the household, which clears this.
        if (body && "incomeConfirmedAt" in body) {
          setIncomeConfirmedAt(body.incomeConfirmedAt ?? null);
        }
        return true;
      } catch (error) {
        // A failed save must never look like a success. Put the patch back so
        // the next attempt still carries it.
        pending.current = { ...patch, ...pending.current };
        setSaveState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not save your answers.",
        });
        return false;
      }
    },
    [data.application.id],
  );

  const patchValues = useCallback(
    (patch: Partial<WizardValues>) => {
      setValues((state) => ({ ...state, ...patch }));
      if (locked) return;
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [flush, locked],
  );

  // Flush on unload so a closed tab doesn't lose the last keystrokes.
  useEffect(() => {
    const handler = () => {
      if (Object.keys(pending.current).length > 0) void flush({ keepalive: true });
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      handler();
    };
  }, [flush]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const issues = useMemo<ValidationIssue[]>(
    () =>
      validateApplication(
        {
          studentId: values.studentId || null,
          schoolYear: values.schoolYear || null,
          schoolId: values.schoolId || null,
          grade: values.grade || null,
          tuitionAfterDiscounts: values.tuitionAfterDiscounts === "" ? null : Number(values.tuitionAfterDiscounts),
          narrative: values.narrative,
          incomeConfirmedAt: incomeConfirmedAt ? new Date(incomeConfirmedAt) : null,
          overflowQualification: values.overflowQualification,
          overflowOrg: values.overflowOrg || null,
          esaCurrentYear: values.esaCurrentYear || null,
          esaPriorYear: values.esaPriorYear || null,
        },
        household.length,
      ),
    [values, incomeConfirmedAt, household.length],
  );

  const issuesForStep = useCallback(
    (id: ApplicationStepId) => issues.filter((issue) => issue.section === id),
    [issues],
  );

  const stepIssues = issuesForStep(step);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goToStep = useCallback(
    async (next: ApplicationStepId) => {
      await flush();
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", next);
      router.push(`?${params.toString()}`, { scroll: true });
      setShowErrors(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [flush, router, searchParams],
  );

  async function advance() {
    if (stepIssues.length > 0 && !locked) {
      setShowErrors(true);
      // Move focus to the first thing that's wrong, not just colour it red.
      const first = document.querySelector<HTMLElement>("[data-field-error='true']");
      first?.focus();
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const next = STEP_IDS[stepPosition + 1];
    if (next) await goToStep(next);
  }

  async function saveAndExit() {
    const ok = await flush();
    if (ok) router.push("/dashboard/parent/apply");
  }

  const sectionEditable = canEditSection(step);

  return (
    <div className="space-y-6">
      <WizardHeader
        data={data}
        saveState={saveState}
        locked={locked}
        partialReopen={partialReopen}
        reopenedSections={reopenedSections}
      />

      <Stepper
        current={step}
        issuesForStep={issuesForStep}
        onSelect={(id) => void goToStep(id)}
      />

      {locked ? (
        <Alert>
          <Lock className="size-4" />
          <AlertTitle>This application is locked</AlertTitle>
          <AlertDescription>
            {COPY.submittedLock}
            {data.application.confirmationCode ? (
              <>
                {" "}
                Your code is{" "}
                <strong className="tabular-nums text-foreground">
                  {data.application.confirmationCode}
                </strong>
                .
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {!sectionEditable && !locked ? (
        <Alert>
          <Lock className="size-4" />
          <AlertDescription>
            This section is read-only. Our team only reopened the sections they asked about.
          </AlertDescription>
        </Alert>
      ) : null}

      <div>
        {step === "family" ? (
          <FamilyStep
            data={data}
            values={values}
            onPatch={patchValues}
            issues={showErrors ? stepIssues : []}
            readOnly={!sectionEditable}
          />
        ) : null}
        {step === "narrative" ? (
          <NarrativeStep
            values={values}
            onPatch={patchValues}
            issues={showErrors ? stepIssues : []}
            readOnly={!sectionEditable}
          />
        ) : null}
        {step === "financial" ? (
          <FinancialStep
            applicationId={data.application.id}
            schoolYear={values.schoolYear}
            household={household}
            householdLastUpdated={data.householdLastUpdated}
            incomeConfirmedAt={incomeConfirmedAt}
            onHouseholdChanged={(next) => {
              setHousehold(next);
              // Any edit clears the confirmation — locally as well as on the
              // server, so the checkbox unticks the moment the table changes.
              setIncomeConfirmedAt(null);
            }}
            onConfirmed={setIncomeConfirmedAt}
            issues={showErrors ? stepIssues : []}
            readOnly={!sectionEditable}
          />
        ) : null}
        {step === "overflow" ? (
          <OverflowStep
            applicationId={data.application.id}
            values={values}
            onPatch={patchValues}
            documents={documents}
            onDocumentsChanged={setDocuments}
            missingImportedDocuments={data.missingImportedDocuments}
            issues={showErrors ? stepIssues : []}
            readOnly={!sectionEditable}
          />
        ) : null}
        {step === "esa" ? (
          <EsaStep
            values={values}
            onPatch={patchValues}
            issues={showErrors ? stepIssues : []}
            readOnly={!sectionEditable}
          />
        ) : null}
        {step === "review" ? (
          <ApplicationReviewStep
            data={data}
            values={values}
            household={household}
            documents={documents}
            incomeConfirmedAt={incomeConfirmedAt}
            issues={issues}
            locked={locked}
            onEditStep={(id) => void goToStep(id)}
            onBeforeSubmit={flush}
          />
        ) : null}
      </div>

      {step !== "review" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            {stepPosition > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="gap-2"
                onClick={() => void goToStep(STEP_IDS[stepPosition - 1])}
              >
                <ArrowLeft className="size-4" aria-hidden />
                Back
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!locked ? (
              <Button type="button" variant="outline" onClick={() => void saveAndExit()}>
                Save and finish later
              </Button>
            ) : null}
            <Button type="button" className="gap-2" onClick={() => void advance()}>
              Next: {APPLICATION_STEPS[stepPosition + 1]?.full ?? "Review"}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}

      {showErrors && stepIssues.length > 0 ? (
        <Alert variant="destructive" role="alert">
          <CircleAlert className="size-4" />
          <AlertTitle>
            {stepIssues.length === 1
              ? "One thing needs your attention"
              : `${stepIssues.length} things need your attention`}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {stepIssues.map((issue) => (
                <li key={issue.field}>{issue.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function WizardHeader({
  data,
  saveState,
  locked,
  partialReopen,
  reopenedSections,
}: {
  data: WizardData;
  saveState: SaveState;
  locked: boolean;
  partialReopen: boolean;
  reopenedSections: ApplicationStepId[];
}) {
  const dueAt = data.application.needsInfoDueAt
    ? new Date(data.application.needsInfoDueAt)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Scholarship application
          </p>
          <h1 className="font-heading text-2xl font-semibold text-primary">
            {data.application.schoolYear
              ? `Apply for the ${data.application.schoolYear} year`
              : "Apply for a scholarship"}
          </h1>
          {data.application.attemptNumber > 1 ? (
            <p className="text-sm text-muted-foreground">
              Attempt {data.application.attemptNumber} for this school year.
            </p>
          ) : null}
        </div>
        {!locked ? <SaveIndicator state={saveState} /> : null}
      </div>

      {data.window?.showClosingDate ? (
        <p className="text-sm text-muted-foreground">
          Applications close on {data.window.closesAtLabel}.
        </p>
      ) : null}

      {data.application.attemptNumber > 1 && data.application.status === "draft" ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>{COPY.importedBanner}</AlertDescription>
        </Alert>
      ) : null}

      {data.priorDenialMessage && data.application.status === "draft" ? (
        <Alert>
          <CircleAlert className="size-4" />
          <AlertTitle>Why the last application wasn&apos;t approved</AlertTitle>
          <AlertDescription>{data.priorDenialMessage}</AlertDescription>
        </Alert>
      ) : null}

      {partialReopen && data.reviewerMessage ? (
        <Alert>
          <CircleAlert className="size-4" />
          <AlertTitle>
            {data.application.infoNotReceived
              ? "We need a little more — it's not too late to reply"
              : dueAt
                ? `We need a little more — please respond by ${formatDate(dueAt)}`
                : "We need a little more"}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{data.reviewerMessage}</p>
            <p className="text-xs">
              Reopened for editing:{" "}
              {reopenedSections
                .map((id) => APPLICATION_STEPS.find((s) => s.id === id)?.full ?? id)
                .join(", ")}
              .
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Honest save state — "Saved" only ever means the server said so. */
function SaveIndicator({ state }: { state: SaveState }) {
  if (state.status === "idle") return null;

  if (state.status === "saving") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-live="polite">
        <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
        Saving…
      </p>
    );
  }

  if (state.status === "saved") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-live="polite">
        <Check className="size-3.5" aria-hidden />
        Saved
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
      <CircleAlert className="size-3.5" aria-hidden />
      {state.message} We&apos;ll retry as you keep typing.
    </p>
  );
}

// ── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  current,
  issuesForStep,
  onSelect,
}: {
  current: ApplicationStepId;
  issuesForStep: (id: ApplicationStepId) => ValidationIssue[];
  onSelect: (id: ApplicationStepId) => void;
}) {
  const currentIndex = STEP_IDS.indexOf(current);

  return (
    <nav aria-label="Application progress" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1">
        {APPLICATION_STEPS.map((stepDef, index) => {
          const isCurrent = stepDef.id === current;
          const isPast = index < currentIndex;
          const hasIssues = issuesForStep(stepDef.id).length > 0;

          return (
            <li key={stepDef.id}>
              <button
                type="button"
                onClick={() => onSelect(stepDef.id)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                    isCurrent
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : isPast && !hasIssues
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isPast && !hasIssues ? <Check className="size-3" /> : index + 1}
                </span>
                {stepDef.label}
                {/* Colour is never the only signal. */}
                {isPast && hasIssues ? (
                  <span className="text-xs font-medium text-destructive">
                    <span aria-hidden>!</span>
                    <span className="sr-only">needs attention</span>
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
