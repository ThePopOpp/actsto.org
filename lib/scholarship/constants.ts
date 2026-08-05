/**
 * Application wizard vocabulary: steps, qualification slugs, ESA answers,
 * grades, and the guidance copy shown alongside each.
 *
 * The copy is deliberate — plain verbs, sentence case, specific messages.
 * Change it as a decision, not as a side effect.
 *
 * Client-safe (no server-only imports).
 */

// ── Steps ────────────────────────────────────────────────────────────────────

export const APPLICATION_STEPS = [
  { id: "family", label: "Family", full: "Family information" },
  { id: "narrative", label: "Narrative", full: "Student narrative" },
  { id: "financial", label: "Financial", full: "Financial information" },
  { id: "overflow", label: "Overflow", full: "Overflow qualification" },
  { id: "esa", label: "ESA status", full: "ESA status" },
  { id: "review", label: "Review", full: "Review and submit" },
] as const;

export type ApplicationStepId = (typeof APPLICATION_STEPS)[number]["id"];

export const STEP_IDS = APPLICATION_STEPS.map((s) => s.id) as readonly ApplicationStepId[];

export function isStepId(value: unknown): value is ApplicationStepId {
  return typeof value === "string" && (STEP_IDS as readonly string[]).includes(value);
}

export function stepIndex(id: ApplicationStepId): number {
  return STEP_IDS.indexOf(id);
}

// ── Overflow qualification ───────────────────────────────────────────────────

export type OverflowQualification = {
  slug: string;
  title: string;
  detail: string;
  /** Supporting documentation is required before this can be counted. */
  needsDocs?: boolean;
  /** Expands the awarding-organization select. */
  needsOrg?: boolean;
  /** The explicit "doesn't apply" answer. */
  isNone?: boolean;
};

export const OVERFLOW_QUALIFICATIONS: OverflowQualification[] = [
  {
    slug: "transfer",
    title: "Moved from an Arizona district or charter school",
    detail:
      "Attended a public school in Arizona for at least 90 days of the prior year, or the first 45 days of this one, before enrolling privately.",
  },
  {
    slug: "disability",
    title: "Student with a disability",
    detail: "Has a MET, IEP, or 504 plan from an Arizona public school. Documentation required.",
    needsDocs: true,
  },
  {
    slug: "preschool",
    title: "Preschooler with a disability",
    detail:
      "Qualifies for preschool services through an Arizona public school. Documentation required.",
    needsDocs: true,
  },
  {
    slug: "kinder",
    title: "Entering kindergarten",
    detail: "First year of school, with no prior private enrollment.",
  },
  {
    slug: "military",
    title: "Dependent of an active-duty service member",
    detail: "A parent is stationed in Arizona on active duty. Documentation required.",
    needsDocs: true,
  },
  {
    slug: "homeschool",
    title: "Homeschooled in Arizona last year",
    detail:
      "Registered as a homeschool student with the county, and not on an ESA. Documentation required.",
    needsDocs: true,
  },
  {
    slug: "outofstate",
    title: "Moved to Arizona from another state or country",
    detail: "New Arizona resident enrolling privately for the first time. Documentation required.",
    needsDocs: true,
  },
  {
    slug: "esa-prior",
    title: "Previously held an ESA",
    detail: "The contract has since been closed or allowed to lapse. Documentation required.",
    needsDocs: true,
  },
  {
    slug: "prior-award",
    title: "Received an Overflow or Corporate scholarship before",
    detail:
      "Awarded by any certified tuition organization in a prior year while at a private school.",
    needsOrg: true,
  },
  {
    slug: "none",
    title: "None of these apply to my student",
    detail:
      "Choose this if no qualifying event fits. Your student is still fully considered for the Original scholarship.",
    isNone: true,
  },
];

export const OVERFLOW_SLUGS = OVERFLOW_QUALIFICATIONS.map((o) => o.slug);

export function overflowBySlug(slug: string | null | undefined): OverflowQualification | null {
  return OVERFLOW_QUALIFICATIONS.find((o) => o.slug === slug) ?? null;
}

export function overflowNeedsDocs(slug: string | null | undefined): boolean {
  return overflowBySlug(slug)?.needsDocs === true;
}

/** A claim of `none` is an answer, but it is not an Overflow qualification. */
export function isOverflowClaim(slug: string | null | undefined): boolean {
  const q = overflowBySlug(slug);
  return !!q && !q.isNone;
}

export const AWARDING_ORGANIZATIONS = [
  "Arizona Christian Tuition",
  "Another certified tuition organization",
  "I'm not sure which one",
];

// ── ESA ──────────────────────────────────────────────────────────────────────

export const ESA_CURRENT_YEAR_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure yet" },
];

export const ESA_PRIOR_YEAR_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const ESA_CURRENT_YEAR_QUESTION =
  "For the year you're applying for, have you signed — or do you plan to sign — an ESA contract for this student?";

export const ESA_PRIOR_YEAR_QUESTION =
  "For the school year just before it, was an ESA contract signed for this student at any point?";

// ── Grades ───────────────────────────────────────────────────────────────────

export const GRADE_OPTIONS = [
  "Preschool",
  "Kindergarten",
  "1st grade",
  "2nd grade",
  "3rd grade",
  "4th grade",
  "5th grade",
  "6th grade",
  "7th grade",
  "8th grade",
  "9th grade",
  "10th grade",
  "11th grade",
  "12th grade",
];

// ── Documents ────────────────────────────────────────────────────────────────

export const DOCUMENT_KINDS = [
  { value: "iep", label: "IEP, MET or 504 plan" },
  { value: "military_orders", label: "Military orders" },
  { value: "esa_closure", label: "ESA closure or lapse notice" },
  { value: "enrollment", label: "Enrollment or residency record" },
  { value: "other", label: "Something else" },
];

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const DOCUMENT_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export const DOCUMENT_BUCKET = "application-documents";

// ── Narrative ────────────────────────────────────────────────────────────────

/** Below this, advancing is blocked. Above the guidance range we warn, never truncate. */
export const NARRATIVE_MIN_WORDS = 25;
export const NARRATIVE_GUIDANCE_MIN = 150;
export const NARRATIVE_GUIDANCE_MAX = 400;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// ── Guidance copy ────────────────────────────────────────────────────────────

export const COPY = {
  parentReadOnlyNotice:
    "Check that these details are right before you continue. To change them, edit your profile.",
  oneApplicationPerStudent: "One application per student, per school year.",
  tuitionHelper:
    "Enter the amount your family still owes for the full year, not the school's published rate.",
  narrativeGuidance:
    "Write about who your student is: character and faith, how they show up for others, what they've worked hard at, what they're involved in at school or in the community. Leave money out of it — income belongs in the financial section, and readers are asked to weigh that separately.",
  narrativeLength: "Two or three paragraphs is the right length.",
  householdDefinition:
    "We use the USDA's definition of a household: people who live together and share income and expenses. Anyone financially independent from you — and their dependents — can be left off, even if you share an address. Everyone else belongs on the list, including children, students living away at school, and people earning nothing.",
  householdDefinitionShort:
    "We use the USDA's definition of a household: people who live together and share income and expenses. You don't have to list anyone financially independent from you, or their dependents, even under the same roof.",
  householdIncludeEveryone:
    "Include everyone else: adults, children, students away at college, and anyone with no income at all. Incomplete rosters slow your review down.",
  financialRequired: "Required. Applications missing income can't be reviewed.",
  headcountHelper: "Counted from the members you list below.",
  overflowGuidance:
    "We award from two funds. Every student is considered for the Original scholarship automatically; the Overflow fund has extra requirements set by state law. Pick the one situation that fits, and upload proof if the option asks for it — we can't count an Overflow qualification without documentation on file.",
  overflowDocsNeeded:
    "Documentation needed. Attach proof below before you submit, or send it to us afterward — we can't count this qualification until it's on file.",
  overflowNoneReassurance:
    "Nothing is lost by answering this way. Most families have no qualifying event, and your student is reviewed for the Original scholarship either way. If your situation changes during the year, let us know and we'll update it.",
  overflowOrgPrompt:
    "Tell us who awarded it. If more than one organization did, choose the most recent.",
  documentsHint: "JPG, PNG, or PDF. Add as many as you need.",
  esaIntro:
    "An ESA is a separate funding source from tax credit scholarships. ESAs are run by the Arizona Department of Education — not by us.",
  esaContractRule:
    "State law bars us from sending tax credit money to a school while a signed ESA contract is in place for that student. Before funds can be released, we need documentation from the Department of Education showing the contract was closed or allowed to lapse.",
  esaHeldAward:
    "A student under contract can still be awarded. We hold the award in the student's name until that documentation arrives, as long as you reapply each school year and the student stays enrolled at a partner school without a break.",
  esaChangeNotice:
    "If your student's ESA status changes at any point during the year, tell us right away.",
  reviewIntro:
    "This is exactly what the review team will see. Use the steps above, or the edit links, to fix anything.",
  incomePageIntro:
    "Keep the income on your active application current. List everyone in your household and what each person earns.",
  incomePageNoApplication:
    "Use this page only if your family already has an application on file for this school year. If you haven't started one, choose Apply for a scholarship instead — every student needs a new application each year.",
  incomeAfterSubmission:
    "Changes here don't alter an application you've already submitted — that one keeps the figures you certified. If something needs correcting on a submitted application, contact our team.",
  submittedLock:
    "Your application is locked while our team reviews it. You can read everything you sent, but changes have to go through us — email or call and quote your confirmation code.",
  importedBanner:
    "We've brought over your previous answers. Review each section before submitting.",
} as const;

// ── Status labels ────────────────────────────────────────────────────────────

/**
 * Parent-facing status wording. "Approved" alone reads as "we're getting
 * money" — approval decides eligibility, and the label has to say so.
 */
export const PARENT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "In review",
  needs_info: "More information needed",
  approved: "Approved — pending award decision",
  denied: "Not approved",
  withdrawn: "Withdrawn",
};

export const STAFF_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  needs_info: "Awaiting information",
  approved: "Approved",
  denied: "Denied",
  withdrawn: "Withdrawn",
};

// ── School years ─────────────────────────────────────────────────────────────

/** '2026/2027' from a calendar year. */
export function schoolYearLabel(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

/** Compact form used in confirmation codes: '2026/2027' → '2627'. */
export function schoolYearCode(schoolYear: string): string {
  const [start, end] = schoolYear.split("/");
  return `${(start ?? "").slice(-2)}${(end ?? "").slice(-2)}`;
}

/** How long a needs-info request stays open. */
export const NEEDS_INFO_DAYS = 30;

/** Reminder cadence, in days remaining, for an open needs-info request. */
export const NEEDS_INFO_REMINDER_DAYS = [14, 7, 1];

/** Reminder cadence, in days remaining, for an unsubmitted draft. */
export const DRAFT_REMINDER_DAYS = [14, 3, 0];

/** Creating this many attempts in one student-year raises a soft staff flag. */
export const ATTEMPT_FLAG_THRESHOLD = 3;
