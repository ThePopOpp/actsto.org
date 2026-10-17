/**
 * Limits on money sent to the school, from the Scholarship Award Policy and
 * the ADOR STO Manual. Client-safe and pure.
 *
 *   - Disabled/displaced: everything from ALL STOs together may not exceed the
 *     lesser of tuition and ADOR's 90%-of-state-aid amount for the student's
 *     special education category and grade (Q150-Q154). No payment until that
 *     year's matrix is entered.
 *   - Tuition: scholarships from all STOs together may not exceed the year's
 *     tuition (Q48). Other STOs' figures are self-reported, so going over them
 *     is a warning with a reason, not a block.
 *   - Low-income stays a per-STO cap; nothing here changes it.
 */

import { parseCsv } from "@/lib/csv";
import { isPreschoolOnlyCategory, REGULAR_EDUCATION } from "@/lib/award-policy/disability";
import { gradeBand, isK12 } from "@/lib/grades";

export type DdGradeBand = "preschool" | "k8" | "9_12";

export const DD_GRADE_BANDS: { value: DdGradeBand; label: string }[] = [
  { value: "preschool", label: "Preschool" },
  { value: "k8", label: "Kindergarten - 8th grade" },
  { value: "9_12", label: "9th - 12th grade" },
];

/** The matrix grade band for a grade label; null when the grade is unknown. */
export function ddGradeBand(grade: string | null | undefined): DdGradeBand | null {
  if (!grade) return null;
  if (!isK12(grade)) return gradeBand(grade) ? "preschool" : null;
  return gradeBand(grade) === "9_12" ? "9_12" : "k8";
}

export const OTHER_STO_PROGRAMS = [
  { value: "disabled_displaced", label: "Disabled/displaced (corporate)" },
  { value: "low_income", label: "Low-income (corporate)" },
  { value: "original", label: "Original (individual)" },
  { value: "switcher", label: "Switcher / Overflow (individual)" },
  { value: "unknown", label: "Not sure" },
] as const;
export type OtherStoProgram = (typeof OTHER_STO_PROGRAMS)[number]["value"];

export function isOtherStoProgram(value: unknown): value is OtherStoProgram {
  return OTHER_STO_PROGRAMS.some((p) => p.value === value);
}

export const ESA_STATUSES = [
  { value: "none", label: "No ESA" },
  { value: "active", label: "Active ESA" },
  { value: "closed", label: "ESA closed" },
] as const;
export type EsaStatusValue = (typeof ESA_STATUSES)[number]["value"];

export const ESA_HOLD_MESSAGE = "Active ESA: award held until the ESA is closed.";
export const ESA_HOLD_LABEL = "Awarded, held: active ESA";

/**
 * The special education category that sets a student's disabled/displaced cap.
 * Displaced students and 504 plans use regular education. A preschool-only
 * category stops at kindergarten: regular education applies from then on, and
 * staff are prompted to check for an updated MET.
 */
export function capCategory(input: {
  grade: string | null | undefined;
  verifiedCategory: string | null | undefined;
  verifiedDocumentType: string | null | undefined;
  disabled: boolean;
  displaced: boolean;
}): { category: string; needsMetCheck: boolean } {
  if (input.disabled && input.verifiedCategory && input.verifiedDocumentType !== "504") {
    if (isPreschoolOnlyCategory(input.verifiedCategory) && isK12(input.grade)) {
      return { category: REGULAR_EDUCATION, needsMetCheck: true };
    }
    return { category: input.verifiedCategory, needsMetCheck: false };
  }
  return { category: REGULAR_EDUCATION, needsMetCheck: false };
}

export type MatrixRow = { spedCategory: string; gradeBand: DdGradeBand; amount90pct: number };

const HEADERS: Record<string, keyof MatrixRow> = {
  spedcategory: "spedCategory",
  category: "spedCategory",
  sped: "spedCategory",
  spedcode: "spedCategory",
  code: "spedCategory",
  gradeband: "gradeBand",
  grade: "gradeBand",
  grades: "gradeBand",
  amount90pct: "amount90pct",
  amount: "amount90pct",
  "90pct": "amount90pct",
  "90percent": "amount90pct",
  ninetypercent: "amount90pct",
  stateaid90: "amount90pct",
};

function normalizeBand(raw: string): DdGradeBand | null {
  const v = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (["preschool", "ps", "pre-k", "prek", "pk"].includes(v)) return "preschool";
  if (["k8", "k-8", "kindergarten-8", "k-8th"].includes(v)) return "k8";
  if (["9_12", "9-12", "912", "hs", "highschool"].includes(v)) return "9_12";
  return null;
}

/**
 * Rows from ADOR's matrix saved as CSV: columns sped_category, grade_band,
 * amount_90pct (header names are forgiving). Returns the rows and one message
 * per unusable line.
 */
export function parseMatrixCsv(csv: string): { rows: MatrixRow[]; errors: string[] } {
  const table = parseCsv(csv);
  if (table.length < 2) return { rows: [], errors: ["The file has no rows below the header."] };
  const keys = table[0].map((h) => HEADERS[h.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null);
  if (!keys.includes("spedCategory") || !keys.includes("gradeBand") || !keys.includes("amount90pct")) {
    return { rows: [], errors: ["The header row needs sped_category, grade_band and amount_90pct columns."] };
  }
  const rows: MatrixRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (k: keyof MatrixRow) => (cells[keys.indexOf(k)] ?? "").trim();
    const spedCategory = get("spedCategory").toUpperCase();
    const band = normalizeBand(get("gradeBand"));
    const amount = Number(get("amount90pct").replace(/[$,\s]/g, ""));
    if (!spedCategory) return errors.push(`Row ${line}: no category.`);
    if (!band) return errors.push(`Row ${line}: grade band must be preschool, k8 or 9_12.`);
    if (!Number.isFinite(amount) || amount < 0) return errors.push(`Row ${line}: the amount isn't a number.`);
    const key = `${spedCategory}|${band}`;
    if (seen.has(key)) return errors.push(`Row ${line}: ${spedCategory} ${band} appears twice.`);
    seen.add(key);
    rows.push({ spedCategory, gradeBand: band, amount90pct: Math.round(amount * 100) / 100 });
  });
  return { rows, errors };
}
