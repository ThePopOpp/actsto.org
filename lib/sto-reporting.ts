/**
 * STO website reporting requirement (A.R.S. § 43-1503(B)(6) and § 43-1603(B)(5)).
 *
 * Each year, by September 30, an STO's website must show — for every
 * scholarship program, for the prior fiscal year — the total dollar amount
 * and percentage of scholarships awarded to students whose family income is
 * up to 185% of the federal poverty level, and to students above 185% but not
 * more than 342.25%.
 *
 * Figures are entered by Super Admins from the STO's annual report rather than
 * derived from award rows: awards carry no program or poverty-level bracket,
 * and the published numbers must match what is filed with ADOR.
 *
 * Client-safe (no server-only imports).
 */

export const STO_REPORTING_KEY = "sto_scholarship_reporting";

export const STO_PROGRAMS = [
  { key: "original_individual", label: "Original Individual Scholarships", statute: "A.R.S. § 43-1089" },
  { key: "switcher_individual", label: "Switcher Individual Scholarships", statute: "A.R.S. § 43-1089.03" },
  { key: "low_income_corporate", label: "Low-Income Corporate Scholarships", statute: "A.R.S. § 43-1183" },
  {
    key: "disabled_displaced_corporate",
    label: "Disabled / Displaced Corporate Scholarships",
    statute: "A.R.S. § 43-1184",
  },
] as const;

export type StoProgramKey = (typeof STO_PROGRAMS)[number]["key"];

export type StoProgramFigures = {
  /** False when the STO did not run this program that year — shown as N/A. */
  offered: boolean;
  totalAwarded: number;
  /** Family income up to 185% of the federal poverty level. */
  upTo185: number;
  /** Family income above 185% and not more than 342.25%. */
  from185To342: number;
};

export type StoReportingYear = {
  /** The fiscal year reported, e.g. "2025". */
  fiscalYear: string;
  /** Human period, e.g. "January 1 – December 31, 2025". */
  periodLabel: string;
  /** Only published years appear on the public page. */
  published: boolean;
  programs: Record<StoProgramKey, StoProgramFigures>;
};

export type StoReportingPayload = { years: StoReportingYear[] };

export function emptyProgramFigures(): Record<StoProgramKey, StoProgramFigures> {
  return Object.fromEntries(
    STO_PROGRAMS.map((p) => [
      p.key,
      { offered: p.key === "original_individual" || p.key === "switcher_individual", totalAwarded: 0, upTo185: 0, from185To342: 0 },
    ]),
  ) as Record<StoProgramKey, StoProgramFigures>;
}

function money(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

/** Shape whatever is stored into a valid payload; never throws. */
export function normalizeStoReporting(raw: unknown): StoReportingPayload {
  const yearsRaw =
    raw && typeof raw === "object" && Array.isArray((raw as { years?: unknown }).years)
      ? ((raw as { years: unknown[] }).years ?? [])
      : [];
  const years: StoReportingYear[] = [];
  for (const entry of yearsRaw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const fiscalYear = typeof e.fiscalYear === "string" ? e.fiscalYear.trim() : "";
    if (!/^\d{4}$/.test(fiscalYear)) continue;
    const programsRaw = (e.programs && typeof e.programs === "object" ? e.programs : {}) as Record<string, unknown>;
    const programs = emptyProgramFigures();
    for (const p of STO_PROGRAMS) {
      const f = programsRaw[p.key];
      if (!f || typeof f !== "object") continue;
      const fig = f as Record<string, unknown>;
      programs[p.key] = {
        offered: fig.offered !== false,
        totalAwarded: money(fig.totalAwarded),
        upTo185: money(fig.upTo185),
        from185To342: money(fig.from185To342),
      };
    }
    years.push({
      fiscalYear,
      periodLabel: typeof e.periodLabel === "string" ? e.periodLabel.trim().slice(0, 120) : "",
      published: e.published === true,
      programs,
    });
  }
  years.sort((a, b) => Number(b.fiscalYear) - Number(a.fiscalYear));
  return { years };
}

/** Problems that must block a save; empty when the payload is valid. */
export function validateStoReporting(payload: StoReportingPayload): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const year of payload.years) {
    if (seen.has(year.fiscalYear)) errors.push(`Fiscal year ${year.fiscalYear} is listed twice.`);
    seen.add(year.fiscalYear);
    for (const p of STO_PROGRAMS) {
      const f = year.programs[p.key];
      if (!f.offered) continue;
      if (Math.round((f.upTo185 + f.from185To342) * 100) > Math.round(f.totalAwarded * 100)) {
        errors.push(
          `${year.fiscalYear} ${p.label}: the two income brackets add up to more than the total awarded.`,
        );
      }
    }
  }
  return errors;
}

/** Percent of the program total, to one decimal; 0 when nothing was awarded. */
export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}
