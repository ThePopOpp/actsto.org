/**
 * Campaign money arithmetic for Allocation, as pure functions in cents so
 * every split is exact and the server, the screen and the tests agree.
 * Client-safe.
 *
 * Every award is drawn from a campaign's gifts to one fund (or, for gifts made
 * without a campaign, from the general pool). A campaign's remaining in a fund
 * is what came in to that fund through the campaign minus every active award
 * drawn from it, whoever the student. The public progress bar counts only the
 * awards made to the campaign's own students; awards to others still use the
 * campaign's money, so admins see them on a separate line.
 */

/** The general pool: paid gifts to a fund made without a campaign. */
export const GENERAL_POOL = "general";

export const toCents = (dollars: number) => Math.round(dollars * 100);
export const toDollars = (cents: number) => cents / 100;

/** `totalCents` split into `n` parts that differ by at most one cent and add up exactly. */
export function splitEvenCents(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalCents / n);
  let extra = totalCents - base * n;
  return Array.from({ length: n }, () => {
    if (extra > 0) {
      extra -= 1;
      return base + 1;
    }
    return base;
  });
}

/**
 * Take `amountCents` evenly from the balances that still have money, never
 * below zero, re-spreading what a smaller balance can't cover across the rest.
 * Returns the new balances and whatever could not be taken.
 */
export function takeEvenly(balances: Map<string, number>, amountCents: number): { balances: Map<string, number>; leftover: number } {
  const next = new Map(balances);
  let left = Math.max(0, amountCents);
  while (left > 0) {
    const open = [...next.entries()].filter(([, v]) => v > 0).sort(([a], [b]) => a.localeCompare(b));
    if (open.length === 0) break;
    const smallest = Math.min(...open.map(([, v]) => v));
    const round = Math.min(left, smallest * open.length);
    const parts = splitEvenCents(round, open.length);
    open.forEach(([key, v], i) => next.set(key, v - Math.min(v, parts[i])));
    const taken = parts.reduce((s, p, i) => s + Math.min(open[i][1], p), 0);
    if (taken === 0) break;
    left -= taken;
  }
  return { balances: next, leftover: left };
}

// ── Recommended remaining ────────────────────────────────────────────────────

export type RecommendedInput = {
  /** The campaign's own students, in display order. */
  studentIds: string[];
  /** Paid gifts to this fund through the campaign: the fund's part of each, and who the donor recommended. */
  gifts: { amount: number; recommendedStudentIds: string[] }[];
  /** Active awards drawn from this campaign and fund. */
  awards: { studentId: string; amount: number }[];
};

export type RecommendedResult = {
  students: { studentId: string; recommended: number; awarded: number; remaining: number }[];
  /** Gifts with no recommendation, less what awards took from them. */
  noRecommendation: number;
  campaignRemaining: number;
};

/**
 * Context only, never a cap on its own: how much of a campaign's money donors
 * pointed at each of its students, and what is left of it.
 *
 * Each gift is split evenly among the students its donor recommended. An award
 * to one of the campaign's students uses that student's share first, then the
 * unrecommended money, then the other students' shares evenly. An award to a
 * student outside the campaign takes evenly from the campaign's students that
 * still have a balance, then from the unrecommended money. Everything is in
 * cents, and the student amounts plus "No recommendation" always equal the
 * campaign's remaining.
 */
export function recommendedRemaining(input: RecommendedInput): RecommendedResult {
  const own = new Set(input.studentIds);
  const share = new Map<string, number>(input.studentIds.map((id) => [id, 0]));
  let noRec = 0;
  for (const gift of input.gifts) {
    const cents = toCents(gift.amount);
    const picked = Array.from(new Set(gift.recommendedStudentIds.filter((id) => own.has(id)))).sort();
    if (picked.length === 0) {
      noRec += cents;
      continue;
    }
    splitEvenCents(cents, picked.length).forEach((part, i) => share.set(picked[i], (share.get(picked[i]) ?? 0) + part));
  }
  const recommended = new Map(share);
  const awarded = new Map<string, number>(input.studentIds.map((id) => [id, 0]));
  let balances = new Map(share);

  // The campaign's own students first, then everyone else, so a student's own
  // award always draws on their own share before others' awards can.
  const ordered = [...input.awards].sort((a, b) => Number(own.has(b.studentId)) - Number(own.has(a.studentId)));
  for (const award of ordered) {
    let cents = toCents(award.amount);
    if (own.has(award.studentId)) {
      awarded.set(award.studentId, (awarded.get(award.studentId) ?? 0) + cents);
      const mine = balances.get(award.studentId) ?? 0;
      const fromMine = Math.min(mine, cents);
      balances.set(award.studentId, mine - fromMine);
      cents -= fromMine;
      const fromPool = Math.min(Math.max(0, noRec), cents);
      noRec -= fromPool;
      cents -= fromPool;
      if (cents > 0) {
        const others = new Map([...balances].filter(([id]) => id !== award.studentId));
        const taken = takeEvenly(others, cents);
        for (const [id, v] of taken.balances) balances.set(id, v);
        cents = taken.leftover;
      }
    } else {
      const taken = takeEvenly(balances, cents);
      balances = taken.balances;
      cents = taken.leftover;
    }
    // More awarded than the campaign received: the pool goes negative and shows it.
    noRec -= cents;
  }

  const students = input.studentIds.map((id) => ({
    studentId: id,
    recommended: toDollars(recommended.get(id) ?? 0),
    awarded: toDollars(awarded.get(id) ?? 0),
    remaining: toDollars(balances.get(id) ?? 0),
  }));
  const remainingCents = [...balances.values()].reduce((s, v) => s + v, 0) + noRec;
  return { students, noRecommendation: toDollars(noRec), campaignRemaining: toDollars(remainingCents) };
}

// ── Funding an award from campaigns ──────────────────────────────────────────

export type FundingPot = {
  /** A campaign id, or GENERAL_POOL. */
  key: string;
  label: string;
  remaining: number;
  /** Oldest paid gift to this fund through this pot, ISO; orders "other campaigns". */
  oldestGiftAt: string | null;
};

export type FundingLine = { key: string; label: string; amount: number };

/**
 * The order an award is funded in: a campaign the admin chose first, then the
 * student's own campaigns, then campaigns whose donors recommended the student,
 * then school-level campaigns at the student's school, then every other
 * campaign with money left (oldest gift first), and the general pool last.
 */
export function fundingOrder(
  pots: FundingPot[],
  opts: { preferKey?: string | null; ownKeys?: string[]; recommendedKeys?: string[]; schoolKeys?: string[] },
): FundingPot[] {
  const rank = (pot: FundingPot) => {
    if (opts.preferKey && pot.key === opts.preferKey) return 0;
    if (opts.ownKeys?.includes(pot.key)) return 1;
    if (opts.recommendedKeys?.includes(pot.key)) return 2;
    if (opts.schoolKeys?.includes(pot.key)) return 3;
    if (pot.key === GENERAL_POOL) return 5;
    return 4;
  };
  return [...pots].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.oldestGiftAt ?? "9999").localeCompare(b.oldestGiftAt ?? "9999") ||
      a.label.localeCompare(b.label),
  );
}

/**
 * Fund `amount` from `pots` in the given order, taking what each has left and
 * reducing the pots in place, so several students planned together never draw
 * the same dollars twice. Returns the lines and anything that could not be funded.
 */
export function fundFromPots(amount: number, orderedPots: FundingPot[]): { lines: FundingLine[]; unfunded: number } {
  let left = toCents(amount);
  const lines: FundingLine[] = [];
  for (const pot of orderedPots) {
    if (left <= 0) break;
    const available = Math.max(0, toCents(pot.remaining));
    const take = Math.min(available, left);
    if (take <= 0) continue;
    lines.push({ key: pot.key, label: pot.label, amount: toDollars(take) });
    pot.remaining = toDollars(available - take);
    left -= take;
  }
  return { lines, unfunded: toDollars(left) };
}
