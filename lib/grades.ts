/**
 * The one grade list. Every form that asks for a grade uses it, and every
 * stored grade is one of these labels, so grade bands (K-8 versus 9-12, and
 * preschool) can be computed reliably for scholarship caps.
 *
 * Client-safe.
 */

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
] as const;

export type GradeLabel = (typeof GRADE_OPTIONS)[number];

/** For school-level campaigns only. */
export const ALL_GRADES = "All grades";

export function isGradeLabel(value: unknown): value is GradeLabel {
  return typeof value === "string" && (GRADE_OPTIONS as readonly string[]).includes(value);
}

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

/**
 * Map a free-text grade to the list: "6th Grade", "6", "grade 6", "K", "Pre-K".
 * Null when it can't be mapped with confidence — those go to the admin grade
 * review list rather than being guessed. Mirrors the migration's SQL mapping.
 */
export function canonicalGrade(raw: string | null | undefined): GradeLabel | null {
  const v = (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!v) return null;
  if (/^(pre-?k|pre-?school|pk|pre-?kindergarten|tk)$/.test(v)) return "Preschool";
  if (/^(k|kg|kinder|kindergarten|kindergarden)$/.test(v)) return "Kindergarten";
  const m = v.match(/^(?:grade )?(\d{1,2})(?:st|nd|rd|th)?(?: grade)?$/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 12) return `${ordinal(n)} grade` as GradeLabel;
  }
  return null;
}

/** 0 for preschool, 1 for kindergarten, 2–13 for grades 1–12. */
export function gradeSortOrder(label: string | null | undefined): number | null {
  const canonical = canonicalGrade(label) ?? (isGradeLabel(label) ? label : null);
  return canonical ? GRADE_OPTIONS.indexOf(canonical) : null;
}

/** K-12 only: displaced funding does not apply to preschool. */
export function isK12(label: string | null | undefined): boolean {
  const order = gradeSortOrder(label);
  return order !== null && order >= 1;
}

export type GradeBand = "k8" | "9_12";

/**
 * Cap band for a grade: K-8 and preschool use the lower cap, 9-12 the higher.
 * Null when the grade is unknown, so a cap can't be applied by guesswork.
 */
export function gradeBand(label: string | null | undefined): GradeBand | null {
  const order = gradeSortOrder(label);
  if (order === null) return null;
  return order >= GRADE_OPTIONS.indexOf("9th grade") ? "9_12" : "k8";
}

export const GRADE_BAND_LABEL: Record<GradeBand, string> = {
  k8: "K-8 (and preschool with a disability)",
  "9_12": "Grades 9-12",
};

/**
 * What to store for a grade a form sent: the list label when it maps, else the
 * text as typed (so it shows on the admin grade review list), else null.
 */
export function normalizeGradeInput(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "-") return null;
  if (trimmed === ALL_GRADES) return trimmed;
  return canonicalGrade(trimmed) ?? trimmed;
}
