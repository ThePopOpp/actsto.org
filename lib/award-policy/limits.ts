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

import { isPreschoolOnlyCategory, REGULAR_EDUCATION, SPED_CATEGORIES } from "@/lib/award-policy/disability";
import { gradeSortOrder, isK12 } from "@/lib/grades";

/** ADOR's five grade bands, in the order its matrix prints them. */
export const DD_GRADE_BANDS = [
  { value: "preschool", label: "Preschool" },
  { value: "k", label: "Kindergarten" },
  { value: "1_3", label: "1st - 3rd" },
  { value: "4_8", label: "4th - 8th" },
  { value: "9_12", label: "9th - 12th" },
] as const;
export type DdGradeBand = (typeof DD_GRADE_BANDS)[number]["value"];

export function ddBandLabel(band: string | null | undefined): string {
  return DD_GRADE_BANDS.find((b) => b.value === band)?.label ?? "an unknown grade";
}

/** The matrix grade band for the student's grade that school year; null when the grade is unknown. */
export function ddGradeBand(grade: string | null | undefined): DdGradeBand | null {
  const order = gradeSortOrder(grade);
  if (order === null) return null;
  if (order === 0) return "preschool";
  if (order === 1) return "k";
  if (order <= 4) return "1_3";
  if (order <= 9) return "4_8";
  return "9_12";
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

// ── ADOR's 90%-of-state-aid matrix ───────────────────────────────────────────

export type BandAmounts = Record<DdGradeBand, number | null>;

/**
 * One matrix row as ADOR prints it: a label (sometimes several codes, as in
 * "ED, MIID, SLD, SLI, OHI, DD"), the codes it covers, and one amount per grade
 * band. A blank amount means the category has no rate for that band.
 */
export type MatrixRow = {
  rowLabel: string;
  codes: string[];
  isRegularEducation: boolean;
  amounts: BandAmounts;
};

export const emptyAmounts = (): BandAmounts => ({ preschool: null, k: null, "1_3": null, "4_8": null, "9_12": null });

/** A label as a lookup key: lower case, one space, plain hyphens. */
export function labelKey(label: string): string {
  return label.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
}

export function isRegularEducationLabel(label: string): boolean {
  return /^regular\s+education/i.test(label.trim());
}

/** One code as stored: upper case, no spaces ("PS D" → "PSD", "SID - SC" → "SID-SC"). */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[–—]/g, "-").replace(/\s+/g, "").trim();
}

/**
 * The codes a row label covers, before staff confirm them: Regular Education
 * is REG; a label that is a category's name ("Preschooler") is its code;
 * otherwise the label split on commas.
 */
export function defaultCodes(label: string): string[] {
  if (isRegularEducationLabel(label)) return [REGULAR_EDUCATION];
  const named = SPED_CATEGORIES.find((c) => c.label.toLowerCase() === label.trim().toLowerCase());
  if (named) return [named.code];
  return Array.from(new Set(label.split(",").map(normalizeCode).filter(Boolean)));
}

export function parseCodes(text: string): string[] {
  return Array.from(new Set(text.split(/[,;]/).map(normalizeCode).filter(Boolean)));
}

/** "FY2026-2027_DD_..." → "2026/2027"; "FY2027" → "2026/2027". Null when the name carries no year. */
export function schoolYearFromFileName(name: string): string | null {
  const range = name.match(/FY\s*[-_ ]?(\d{4})\s*[-–_ ]\s*(\d{2,4})/i);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2].length === 2 ? `${range[1].slice(0, 2)}${range[2]}` : range[2]);
    if (end === start + 1) return `${start}/${end}`;
  }
  const single = name.match(/FY\s*[-_ ]?(\d{4})(?!\d)/i);
  if (single) {
    const end = Number(single[1]);
    return `${end - 1}/${end}`;
  }
  return null;
}

/** A header cell to a grade band: "1st - 3rd", "1st-3rd", "1st – 3rd", "Grades 1-3", any case. */
function headerBand(raw: string): DdGradeBand | null {
  const v = raw
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/grades?|\s+/g, "")
    .replace(/(\d+)(st|nd|rd|th)/g, "$1");
  if (["preschool", "ps", "prek", "pre-k", "pk"].includes(v)) return "preschool";
  if (["kindergarten", "k", "kg", "kinder"].includes(v)) return "k";
  if (v === "1-3") return "1_3";
  if (v === "4-8") return "4_8";
  if (v === "9-12") return "9_12";
  return null;
}

/** "$1,234.50" → 1234.5; "" → null; anything else → NaN. */
function amountCell(raw: string | undefined): number | null {
  const v = (raw ?? "").replace(/[$,\s]/g, "");
  if (!v) return null;
  if (!/^-?\d+(\.\d+)?$/.test(v)) return Number.NaN;
  return Math.round(Number(v) * 100) / 100;
}

export type MatrixParse = { rows: MatrixRow[]; errors: string[] };

/**
 * ADOR's matrix as published (wide layout): one row per special education
 * category, one column per grade band. `aliases` holds codes staff confirmed
 * for a label in an earlier year, keyed by labelKey.
 */
export function parseAdorMatrix(table: string[][], aliases: Map<string, string[]> = new Map()): MatrixParse {
  const rows = table.filter((r) => r.some((c) => (c ?? "").trim()));
  if (rows.length < 2) return { rows: [], errors: ["The file has no rows below the header."] };
  const header = rows[0].map((h) => (h ?? "").replace(/^﻿/, "").trim());
  const columns = new Map<DdGradeBand, number>();
  header.forEach((h, i) => {
    const band = headerBand(h);
    if (band && !columns.has(band)) columns.set(band, i);
  });
  const missing = DD_GRADE_BANDS.filter((b) => !columns.has(b.value));
  if (missing.length) {
    return {
      rows: [],
      errors: [
        `This doesn't look like ADOR's matrix: no ${missing.map((b) => `"${b.label}"`).join(", ")} column. The header needs Preschool, Kindergarten, 1st - 3rd, 4th - 8th and 9th - 12th.`,
      ],
    };
  }
  const labelColumn = Math.max(0, header.findIndex((h) => /categor/i.test(h)));
  const out: MatrixRow[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const rowLabel = (cells[labelColumn] ?? "").trim();
    if (!rowLabel) {
      if (cells.some((c) => (c ?? "").trim())) errors.push(`Row ${line}: amounts with no category label.`);
      return;
    }
    const amounts = emptyAmounts();
    for (const band of DD_GRADE_BANDS) {
      const value = amountCell(cells[columns.get(band.value)!]);
      if (value !== null && !(value > 0)) {
        errors.push(`Row ${line} (${rowLabel}), ${band.label}: "${cells[columns.get(band.value)!]}" isn't a positive amount.`);
        continue;
      }
      amounts[band.value] = value;
    }
    out.push({
      rowLabel,
      codes: aliases.get(labelKey(rowLabel)) ?? defaultCodes(rowLabel),
      isRegularEducation: isRegularEducationLabel(rowLabel),
      amounts,
    });
  });
  return { rows: out, errors };
}

export type MatrixCheck = { errors: string[]; warnings: string[] };

/**
 * Errors block the save; warnings (a code we don't know yet) need the admin's
 * acknowledgment. `knownCodes` adds codes from earlier matrices.
 */
export function checkMatrix(rows: MatrixRow[], knownCodes: string[] = []): MatrixCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!rows.length) errors.push("The matrix has no rows.");
  const regular = rows.filter((r) => r.isRegularEducation);
  if (regular.length !== 1) {
    errors.push(
      regular.length === 0
        ? "There's no Regular Education row. Displaced students and 504 plans use it."
        : "There's more than one Regular Education row.",
    );
  }
  const owner = new Map<string, string>();
  const known = new Set([...SPED_CATEGORIES.map((c) => c.code), ...knownCodes.map(normalizeCode)]);
  for (const row of rows) {
    if (!row.rowLabel.trim()) errors.push("Every row needs its label.");
    if (!row.codes.length) errors.push(`${row.rowLabel}: list the category codes this row covers.`);
    if (DD_GRADE_BANDS.every((b) => row.amounts[b.value] === null)) errors.push(`${row.rowLabel}: no amounts.`);
    for (const band of DD_GRADE_BANDS) {
      const n = row.amounts[band.value];
      if (n !== null && !(Number.isFinite(n) && n > 0)) errors.push(`${row.rowLabel}, ${band.label}: amounts must be positive or blank.`);
    }
    for (const code of row.codes) {
      const other = owner.get(code);
      if (other && other !== row.rowLabel) errors.push(`${code} appears in two rows: "${other}" and "${row.rowLabel}".`);
      owner.set(code, row.rowLabel);
      if (!known.has(code)) warnings.push(`${code} (in "${row.rowLabel}") isn't a category code we know yet. Check it before saving.`);
    }
  }
  return { errors: Array.from(new Set(errors)), warnings: Array.from(new Set(warnings)) };
}

export type CellChange = { rowLabel: string; band: DdGradeBand; before: number | null; after: number | null; pct: number | null; flagged: boolean };

/** Each cell against the prior year's matrix (matched by label, then by shared code); over 15% is flagged. */
export function compareMatrices(prior: MatrixRow[], next: MatrixRow[]): CellChange[] {
  const out: CellChange[] = [];
  for (const row of next) {
    const before =
      prior.find((p) => labelKey(p.rowLabel) === labelKey(row.rowLabel)) ??
      prior.find((p) => p.codes.some((c) => row.codes.includes(c)));
    for (const band of DD_GRADE_BANDS) {
      const a = before ? before.amounts[band.value] : null;
      const b = row.amounts[band.value];
      if (a === b) continue;
      const pct = a !== null && b !== null && a > 0 ? Math.round(((b - a) / a) * 1000) / 10 : null;
      out.push({ rowLabel: row.rowLabel, band: band.value, before: a, after: b, pct, flagged: pct !== null && Math.abs(pct) > 15 });
    }
  }
  return out;
}

export type RateLookup = { amount: number | null; rowLabel: string | null; problem: string | null };

/**
 * The 90% state aid amount for a category and band. A code with no row, or a
 * blank cell, has no rate: payments wait until staff fix the category or the
 * row's codes. Never a $0 cap.
 */
export function rateFor(rows: MatrixRow[], category: string, band: DdGradeBand | null): RateLookup {
  const code = normalizeCode(category);
  if (!band) return { amount: null, rowLabel: null, problem: "The student's grade for this school year isn't set, so no state aid rate applies. Set the grade." };
  const row = code === REGULAR_EDUCATION ? rows.find((r) => r.isRegularEducation) : rows.find((r) => r.codes.includes(code));
  const amount = row ? row.amounts[band] : null;
  if (!row || amount === null) {
    return {
      amount: null,
      rowLabel: row?.rowLabel ?? null,
      problem: `No state aid rate for ${code === REGULAR_EDUCATION ? "Regular Education" : code} in ${ddBandLabel(band)}: check the category.`,
    };
  }
  return { amount, rowLabel: row.rowLabel, problem: null };
}
