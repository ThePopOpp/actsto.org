/**
 * The low-income income table and the eligibility calculation that uses it.
 *
 * Client-safe, so the admin editor validates with exactly the arithmetic the
 * server enforces on save.
 */

export type IncomeTableRow = {
  householdSize: number;
  /** 185% of the federal poverty level — the reduced-price lunch base. */
  base185: number;
  /** The low-income scholarship limit: 185% of the base. */
  maxIncome: number;
};

export type IncomeTable = {
  schoolYear: string;
  rows: IncomeTableRow[];
  additionalBase: number;
  additionalMax: number;
  sourceNote?: string | null;
};

const MULTIPLIER = 1.85;

/**
 * Every row must satisfy maxIncome = round(base185 × 1.85), each household size
 * must step by the "each additional member" figure, and the increment must
 * satisfy the same ×1.85 rule. That is what caught the circulated typo ($50,052
 * for a household of 3, which is $50,542). Returns one message per problem.
 */
export function validateIncomeTable(table: IncomeTable): string[] {
  const errors: string[] = [];
  if (!/^\d{4}\/\d{4}$/.test(table.schoolYear)) errors.push("School year must look like 2026/2027.");

  const rows = [...table.rows].sort((a, b) => a.householdSize - b.householdSize);
  for (let size = 1; size <= 8; size++) {
    if (!rows.some((r) => r.householdSize === size)) errors.push(`Household size ${size} is missing.`);
  }

  for (const row of rows) {
    if (!(row.base185 > 0) || !(row.maxIncome > 0)) {
      errors.push(`Household size ${row.householdSize}: both figures must be above zero.`);
      continue;
    }
    const expected = Math.round(row.base185 * MULTIPLIER);
    if (Math.abs(expected - row.maxIncome) > 1) {
      errors.push(
        `Household size ${row.householdSize}: $${row.base185.toLocaleString()} × 1.85 is $${expected.toLocaleString()}, not $${row.maxIncome.toLocaleString()}.`,
      );
    }
  }

  if (table.additionalBase > 0) {
    for (let i = 1; i < rows.length; i++) {
      const step = rows[i].base185 - rows[i - 1].base185;
      if (Math.abs(step - table.additionalBase) > 1) {
        errors.push(
          `Household size ${rows[i].householdSize}: it should be $${table.additionalBase.toLocaleString()} more than size ${rows[i - 1].householdSize}, but the difference is $${step.toLocaleString()}.`,
        );
      }
    }
  }

  const expectedAdditional = Math.round(table.additionalBase * MULTIPLIER);
  if (Math.abs(expectedAdditional - table.additionalMax) > 1) {
    errors.push(
      `Each additional member: $${table.additionalBase.toLocaleString()} × 1.85 is $${expectedAdditional.toLocaleString()}, not $${table.additionalMax.toLocaleString()}.`,
    );
  }
  return errors;
}

/** The income limit for a household size; above 8, the increment applies per member. */
export function incomeLimitFor(table: IncomeTable, householdSize: number): number | null {
  if (!Number.isInteger(householdSize) || householdSize < 1) return null;
  const rows = [...table.rows].sort((a, b) => a.householdSize - b.householdSize);
  const exact = rows.find((r) => r.householdSize === householdSize);
  if (exact) return exact.maxIncome;
  const largest = rows[rows.length - 1];
  if (!largest || householdSize < largest.householdSize) return null;
  return largest.maxIncome + (householdSize - largest.householdSize) * table.additionalMax;
}

export type LowIncomeCalculation = {
  schoolYear: string;
  householdSize: number;
  annualIncome: number;
  limit: number;
  qualifies: boolean;
};

/** The calculation staff see: income entered, household size, limit applied, result. */
export function calculateLowIncome(
  table: IncomeTable,
  householdSize: number,
  annualIncome: number,
): LowIncomeCalculation | null {
  const limit = incomeLimitFor(table, householdSize);
  if (limit === null) return null;
  return {
    schoolYear: table.schoolYear,
    householdSize,
    annualIncome,
    limit,
    qualifies: annualIncome <= limit,
  };
}

/** Narrow the JSON column without trusting it. */
export function readIncomeRows(value: unknown): IncomeTableRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((r) => (r && typeof r === "object" ? (r as Record<string, unknown>) : null))
    .filter((r): r is Record<string, unknown> => r !== null)
    .map((r) => ({
      householdSize: Number(r.householdSize),
      base185: Number(r.base185),
      maxIncome: Number(r.maxIncome),
    }))
    .filter((r) => Number.isInteger(r.householdSize) && r.householdSize > 0);
}
