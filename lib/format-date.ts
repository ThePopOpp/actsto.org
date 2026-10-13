/**
 * Date display for ACT. Client-safe.
 *
 * Two kinds of value reach the screen, and they need opposite handling:
 *
 * - Moments (createdAt, paidAt, decidedAt…) are instants in time. They are
 *   shown on the Arizona calendar: a gift at 8 PM on Oct 1 in Phoenix is
 *   03:00 UTC on Oct 2, and formatting it in UTC (the server's zone, or
 *   `toISOString().slice(0, 10)`) shows the next day.
 * - Calendar dates (a campaign's start and end, an invoice due date) are a day,
 *   not an instant. They are stored as midnight UTC, so converting them to
 *   Arizona time would move June 30 back to June 29. They are read as written.
 *
 * Arizona does not observe daylight saving, so America/Phoenix is UTC-7 all year.
 */

export const ACT_TIME_ZONE = "America/Phoenix";

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A moment as an Arizona date: "Oct 12, 2026". */
export function formatDate(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ACT_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** A moment as an Arizona date and time: "Oct 12, 2026, 2:30 PM". */
export function formatDateTime(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ACT_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** A moment as "yyyy-MM-dd" on the Arizona calendar. Use in place of toISOString().slice(0, 10). */
export function isoDateInArizona(value: DateInput): string {
  const date = toDate(value);
  if (!date) return "";
  // en-CA formats as yyyy-MM-dd.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** A calendar date (stored as midnight UTC, or "yyyy-MM-dd") as written: "Jun 30, 2027". */
export function formatCalendarDate(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** A calendar date as a local Date at midnight, for placing it on a calendar grid. */
export function calendarDateToLocal(value: string | Date): Date {
  const iso = value instanceof Date ? value.toISOString() : value;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
