import "server-only";

import type { ApplicationWindow } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ScopeError } from "@/lib/scholarship/scope";

/**
 * Application windows: the date range during which a school year accepts
 * applications.
 *
 * Windows are data, not constants. Staff move these dates and should not need a
 * deploy to do it.
 */

export type WindowPhase =
  /** Published, but not open yet. */
  | "upcoming"
  /** Accepting applications. */
  | "open"
  /** Past `closesAt`, inside `lateGraceUntil` — existing drafts may still submit. */
  | "grace"
  /** Past everything. */
  | "closed"
  /** No window row exists for this year at all. */
  | "none";

export type WindowState = {
  window: ApplicationWindow | null;
  phase: WindowPhase;
  /** May a *new* draft be started? */
  canStart: boolean;
  /** May an existing draft still be submitted? */
  canSubmit: boolean;
  /** Days until `closesAt`. Negative once past. Null when there is no window. */
  daysUntilClose: number | null;
  /** Show the closing date in the header once inside 30 days. */
  showClosingDate: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / DAY_MS);
}

export function resolveWindowState(
  window: ApplicationWindow | null,
  now: Date = new Date(),
): WindowState {
  if (!window || !window.isPublished) {
    return {
      window,
      phase: "none",
      canStart: false,
      canSubmit: false,
      daysUntilClose: null,
      showClosingDate: false,
    };
  }

  const daysUntilClose = daysBetween(now, window.closesAt);

  if (now < window.opensAt) {
    return {
      window,
      phase: "upcoming",
      canStart: false,
      canSubmit: false,
      daysUntilClose,
      showClosingDate: false,
    };
  }

  if (now <= window.closesAt) {
    return {
      window,
      phase: "open",
      canStart: true,
      canSubmit: true,
      daysUntilClose,
      // A scholarship application, not a flash sale — a date, no countdown.
      showClosingDate: daysUntilClose <= 30,
    };
  }

  if (window.lateGraceUntil && now <= window.lateGraceUntil) {
    return {
      window,
      phase: "grace",
      // Grace is for drafts already started, not for new applications.
      canStart: false,
      canSubmit: true,
      daysUntilClose,
      showClosingDate: true,
    };
  }

  return {
    window,
    phase: "closed",
    canStart: false,
    canSubmit: false,
    daysUntilClose,
    showClosingDate: false,
  };
}

// ── Lookups ──────────────────────────────────────────────────────────────────

export async function getWindowForYear(schoolYear: string) {
  return prisma.applicationWindow.findUnique({ where: { schoolYear } });
}

/**
 * The window a parent should land on: the one open now, else the next published
 * one to open, else the most recently closed. Returning something even when
 * nothing is open is what lets the wizard explain itself rather than 404.
 */
export async function getActiveWindow(now: Date = new Date()) {
  const open = await prisma.applicationWindow.findFirst({
    where: { isPublished: true, opensAt: { lte: now }, closesAt: { gte: now } },
    orderBy: { closesAt: "asc" },
  });
  if (open) return open;

  const upcoming = await prisma.applicationWindow.findFirst({
    where: { isPublished: true, opensAt: { gt: now } },
    orderBy: { opensAt: "asc" },
  });
  if (upcoming) return upcoming;

  return prisma.applicationWindow.findFirst({
    where: { isPublished: true },
    orderBy: { closesAt: "desc" },
  });
}

/** The next published window after this one, for "applications reopen on…" copy. */
export async function getNextWindow(after: Date = new Date()) {
  return prisma.applicationWindow.findFirst({
    where: { isPublished: true, opensAt: { gt: after } },
    orderBy: { opensAt: "asc" },
  });
}

// ── Submit-time enforcement ──────────────────────────────────────────────────

/**
 * Enforce the window at the moment of submission, against the window row as it
 * stands right now.
 *
 * A wizard left open in a browser tab across the deadline must not be able to
 * submit. That check cannot live in the client, and it cannot rely on state
 * captured when the page loaded.
 */
export async function assertWindowOpenForSubmit(schoolYear: string | null): Promise<ApplicationWindow> {
  if (!schoolYear) {
    throw new ScopeError("This application has no school year set.", 400);
  }

  const window = await getWindowForYear(schoolYear);
  const state = resolveWindowState(window);

  if (!state.canSubmit) {
    if (state.phase === "upcoming" && window) {
      throw new ScopeError(
        `Applications for ${schoolYear} open on ${formatWindowDate(window.opensAt)}.`,
        409,
      );
    }
    if (state.phase === "closed" && window) {
      throw new ScopeError(
        `Applications for ${schoolYear} closed on ${formatWindowDate(window.closesAt)}. Your draft is saved — contact our team if you need to submit it late.`,
        409,
      );
    }
    throw new ScopeError(`Applications for ${schoolYear} are not open.`, 409);
  }

  return window!;
}

/** "12 September 2026" — a real date, never "within 30 days". */
export function formatWindowDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Phoenix",
  }).format(date);
}

export function formatWindowDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
    timeZoneName: "short",
  }).format(date);
}
