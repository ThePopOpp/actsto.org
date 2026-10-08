/**
 * Eligibility rules staff can change without a deploy. Client-safe types and
 * defaults; the server reader lives in settings-server.ts.
 */

export const ELIGIBILITY_SETTINGS_KEY = "eligibility_settings";

export type EligibilitySettings = {
  /**
   * Whether an approved disability verification carries into later school
   * years. Off (re-verify each year) until compliance confirms otherwise.
   */
  disabilityCarriesOver: boolean;
  /** Parent-facing definition of a displaced student. */
  displacedDefinition: string;
  /** Parent-facing list of accepted income proof. */
  incomeProofGuidance: string;
};

export const DEFAULT_ELIGIBILITY_SETTINGS: EligibilitySettings = {
  disabilityCarriesOver: false,
  displacedDefinition:
    "A displaced student is one who was placed in the Arizona foster care system under A.R.S. Title 8 at any point in time. Out-of-state placements, international placements and private adoptions do not qualify. We confirm placement with the Arizona Department of Child Safety (DCS) using our verification form; please don't send court documents, case files or emails with caseworkers.",
  incomeProofGuidance:
    "Upload one of: your most recent tax return (Arizona Form 140 or your W-2s), recent pay stubs for everyone who earns income, or proof of government assistance such as WIC, AHCCCS or SNAP (food stamps). We need it each school year.",
};

const MAX_TEXT = 4000;

export function normalizeEligibilitySettings(raw: unknown): EligibilitySettings {
  const value = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const text = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, MAX_TEXT) : fallback;
  return {
    disabilityCarriesOver:
      typeof value.disabilityCarriesOver === "boolean"
        ? value.disabilityCarriesOver
        : DEFAULT_ELIGIBILITY_SETTINGS.disabilityCarriesOver,
    displacedDefinition: text(value.displacedDefinition, DEFAULT_ELIGIBILITY_SETTINGS.displacedDefinition),
    incomeProofGuidance: text(value.incomeProofGuidance, DEFAULT_ELIGIBILITY_SETTINGS.incomeProofGuidance),
  };
}
