/**
 * Campaign end-date rule: a campaign may run until June 30 of the year after
 * the year it starts — Sep 30, 2026 allows Jun 30, 2027; Feb 1, 2027 allows
 * Jun 30, 2028. New campaigns default to that same date.
 *
 * Shared by the date pickers, the editor defaults and every API that writes
 * endsAt, so the UI and the server can never disagree. Dates are plain
 * "yyyy-MM-dd" strings, compared as strings, so time zones cannot shift them.
 *
 * Client-safe (no server-only imports).
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "yyyy-MM-dd" from a date string or Date; null when unusable. */
export function toIsoDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const head = value.trim().slice(0, 10);
  return ISO_DATE.test(head) ? head : null;
}

/** The start date the rule is measured from: the campaign's start, or today. */
function effectiveStart(start: string | Date | null | undefined, now?: Date): string {
  return toIsoDate(start) ?? todayIso(now);
}

/** Latest allowed end date: June 30 of the year after the start year. */
export function maxCampaignEndDate(start?: string | Date | null, now?: Date): string {
  const startYear = Number(effectiveStart(start, now).slice(0, 4));
  return `${startYear + 1}-06-30`;
}

/** Default end date for a new campaign — the same as the maximum. */
export function defaultCampaignEndDate(start?: string | Date | null, now?: Date): string {
  return maxCampaignEndDate(start, now);
}

/**
 * Why an end date is not allowed, or null when it is. A missing end date is
 * allowed here; callers that need one fill in defaultCampaignEndDate.
 */
export function campaignEndDateError(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  now?: Date,
): string | null {
  const endIso = toIsoDate(end);
  if (!endIso) return null;
  const startIso = toIsoDate(start);
  if (startIso && endIso < startIso) return "The end date can't be before the start date.";
  const max = maxCampaignEndDate(start, now);
  if (endIso > max) {
    const [y, m, d] = max.split("-").map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return `A campaign can run until ${label} at the latest (June 30 of the year after it starts).`;
  }
  return null;
}
