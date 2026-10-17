/**
 * Disability verification rules from the Scholarship Award Policy (Oct 16,
 * 2026) and the ADOR STO Manual, Q143-Q154. Client-safe and pure, so the
 * reviewer screen and the server explain a refusal the same way.
 *
 * A disability is verified once by ACTSTO and carries forward to every later
 * school year. Documents may be current or expired; they must come from an
 * Arizona public school or district.
 */

export const DISABILITY_DOCUMENT_TYPES = [
  { value: "IEP", label: "IEP (Individualized Education Program)" },
  { value: "MET", label: "MET (Multidisciplinary Evaluation Team report)" },
  { value: "ISP", label: "ISP (Individual Service Plan) from a public school" },
  { value: "504", label: "504 plan (or a public school letter that the student would qualify)" },
] as const;
export type DisabilityDocumentType = (typeof DISABILITY_DOCUMENT_TYPES)[number]["value"];

/** Regular education: displaced students, 504 plans, and former preschoolers without a new MET. */
export const REGULAR_EDUCATION = "REG";

/**
 * Special education categories used by ADOR's 90%-of-state-aid matrix. The
 * matrix itself is data; codes found in an imported matrix are offered too.
 */
export const SPED_CATEGORIES: { code: string; label: string; preschoolOnly?: boolean; preschoolEligible?: boolean }[] = [
  { code: REGULAR_EDUCATION, label: "Regular education" },
  { code: "A", label: "Autism" },
  { code: "DD", label: "Developmental delay", preschoolEligible: true },
  { code: "ED", label: "Emotional disability" },
  { code: "EDP", label: "Emotional disability, private placement" },
  { code: "HI", label: "Hearing impairment", preschoolEligible: true },
  { code: "MD", label: "Multiple disabilities" },
  { code: "MDSSI", label: "Multiple disabilities with severe sensory impairment" },
  { code: "MIID", label: "Mild intellectual disability" },
  { code: "MOID", label: "Moderate intellectual disability" },
  { code: "SID", label: "Severe intellectual disability" },
  { code: "OHI", label: "Other health impairment" },
  { code: "OI", label: "Orthopedic impairment" },
  { code: "P", label: "Preschooler", preschoolOnly: true },
  { code: "PSD", label: "Preschool severe delay", preschoolOnly: true, preschoolEligible: true },
  { code: "SLD", label: "Specific learning disability" },
  { code: "SLI", label: "Speech/language impairment", preschoolEligible: true },
  { code: "TBI", label: "Traumatic brain injury" },
  { code: "VI", label: "Visual impairment", preschoolEligible: true },
];

export function spedLabel(code: string | null | undefined): string {
  if (!code) return "—";
  return SPED_CATEGORIES.find((c) => c.code === code)?.label ?? code;
}

/** Categories that end at preschool: from kindergarten on, regular education applies unless a new MET says otherwise. */
export function isPreschoolOnlyCategory(code: string | null | undefined): boolean {
  return Boolean(code && SPED_CATEGORIES.find((c) => c.code === code)?.preschoolOnly);
}

/** The disabilities a preschooler's IEP, MET or ISP must name. */
export const PRESCHOOL_QUALIFYING = SPED_CATEGORIES.filter((c) => c.preschoolEligible).map((c) => c.code);

export type DisabilityChecklist = {
  documentType: string | null | undefined;
  issuedByAzPublic: boolean | null | undefined;
  disabilityNamed: string | null | undefined;
  spedCategory: string | null | undefined;
  /** preschool | k12 */
  gradeBand: string | null | undefined;
};

/** Why a disability verification can't be approved on this checklist, or null. */
export function disabilityApprovalError(c: DisabilityChecklist): string | null {
  if (c.issuedByAzPublic !== true) {
    return "Only documents issued by an Arizona public school or district qualify. Private-school ISPs, doctor's notes and outside evaluations don't. Deny this one instead.";
  }
  if (!DISABILITY_DOCUMENT_TYPES.some((d) => d.value === c.documentType)) return "Choose the document type.";
  if (c.gradeBand !== "preschool" && c.gradeBand !== "k12") return "Choose the grade band at verification.";
  if (!c.disabilityNamed?.trim()) return "Record the disability the document names.";
  if (c.documentType === "504") {
    if (c.gradeBand === "preschool") return "504 plans qualify K-12 only, never preschool. A preschooler needs an IEP, MET or ISP.";
    if (c.spedCategory && c.spedCategory !== REGULAR_EDUCATION) return "Leave the SPED category blank for a 504 plan; it uses regular education.";
    return null;
  }
  if (!c.spedCategory) return "Choose the special education category the document names.";
  if (c.gradeBand === "preschool" && !PRESCHOOL_QUALIFYING.includes(c.spedCategory)) {
    return "A preschooler qualifies only with an IEP, MET or ISP naming hearing impairment, visual impairment, developmental delay, preschool severe delay or speech/language impairment.";
  }
  return null;
}

/** Help text on every disability upload screen. */
export const DISABILITY_DOCUMENT_HELP =
  "Upload the student's IEP, MET, ISP or 504 plan from an Arizona public school or district. A current or expired document is fine, and once we verify it you won't need to send it again. A letter from an Arizona public school saying the student would qualify for a 504 plan if enrolled there counts as a 504 plan. We can't accept private-school ISPs, doctor's notes or outside evaluations. 504 plans qualify for K-12 only; a preschooler needs an IEP, MET or ISP. A verification from another STO doesn't carry over: send us the document so we can verify it ourselves.";
