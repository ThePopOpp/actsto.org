import "server-only";

import { randomUUID } from "node:crypto";

import { logAdminActivity } from "@/lib/admin/audit";
import {
  fundingOrder,
  fundFromPots,
  GENERAL_POOL,
  recommendedRemaining,
  splitEvenCents,
  toCents,
  toDollars,
  type FundingLine,
  type FundingPot,
  type RecommendedResult,
} from "@/lib/allocation/funding-plan";
import { awardAmountError, fundEligibilityError } from "@/lib/allocation/rules";
import {
  AllocationError,
  fundBalances,
  recomputeCampaignAwarded,
  studentEligibility,
  type AllocationActor,
} from "@/lib/allocation/server";
import { EXCLUDE_ARCHIVED_TESTS } from "@/lib/donors/server";
import { arizonaTodayAsCalendarDate } from "@/lib/format-date";
import { FUNDING_SOURCE_LABEL, FUNDING_SOURCES, isFundingSource, type FundingSource } from "@/lib/funding-sources";
import { prisma } from "@/lib/prisma";

const round2 = (n: number) => Math.round(n * 100) / 100;

export const GENERAL_LABEL = "General gifts (no campaign)";

// ── Ledger: every campaign × fund ────────────────────────────────────────────

export type CampaignFundRow = {
  /** A campaign id, or GENERAL_POOL. */
  key: string;
  label: string;
  isSchoolLevel: boolean;
  schoolId: string | null;
  fundingSource: FundingSource;
  received: number;
  /** Awards drawn from this campaign to its own students (the public bar). */
  awardedInCampaign: number;
  /** Awards drawn from this campaign to students who aren't on it. */
  awardedToOthers: number;
  remaining: number;
  oldestGiftAt: string | null;
};

export type CampaignLedger = {
  rows: CampaignFundRow[];
  /** Active awards that name no campaign yet (made before campaigns were required). */
  unattached: { fundingSource: FundingSource; amount: number; count: number }[];
  /** Campaign ids each student is on. */
  ownCampaigns: (studentId: string) => string[];
  /** School-level campaigns at a school. */
  schoolCampaigns: (schoolId: string | null) => string[];
};

/**
 * Received, awarded and remaining for every campaign in every fund, plus the
 * general pool of gifts made without a campaign. Rebuilt from rows each time.
 * The rows for a fund add up to that fund's totals: received from the same
 * paid splits, awarded from the same active awards (attached ones here,
 * unattached ones listed separately).
 */
export async function campaignLedger(): Promise<CampaignLedger> {
  const [splits, awards] = await Promise.all([
    prisma.donationFundSplit.findMany({
      where: { donation: { status: "paid", AND: [EXCLUDE_ARCHIVED_TESTS] } },
      select: { fundingSource: true, amount: true, donation: { select: { campaignId: true, createdAt: true } } },
    }),
    prisma.scholarshipAward.findMany({
      where: { status: { not: "reversed" }, fundingSource: { not: null } },
      select: {
        campaignId: true,
        drawsFromGeneral: true,
        fundingSource: true,
        awardAmount: true,
        studentId: true,
        schoolId: true,
        student: { select: { schoolId: true } },
      },
    }),
  ]);

  const campaignIds = new Set<string>();
  for (const s of splits) if (s.donation.campaignId) campaignIds.add(s.donation.campaignId);
  for (const a of awards) if (a.campaignId) campaignIds.add(a.campaignId);
  const campaigns = campaignIds.size
    ? await prisma.campaign.findMany({
        where: { id: { in: [...campaignIds] } },
        select: { id: true, title: true, isSchoolLevel: true, schoolId: true, campaignStudents: { select: { studentId: true } } },
      })
    : [];
  const byId = new Map(campaigns.map((c) => [c.id, { ...c, students: new Set(c.campaignStudents.map((cs) => cs.studentId)) }]));

  type Acc = { received: number; inCampaign: number; others: number; oldest: Date | null };
  const acc = new Map<string, Acc>();
  const get = (key: string, source: string) => {
    const id = `${key}|${source}`;
    let row = acc.get(id);
    if (!row) {
      row = { received: 0, inCampaign: 0, others: 0, oldest: null };
      acc.set(id, row);
    }
    return row;
  };

  for (const s of splits) {
    if (!isFundingSource(s.fundingSource)) continue;
    const row = get(s.donation.campaignId ?? GENERAL_POOL, s.fundingSource);
    row.received += toCents(Number(s.amount));
    if (!row.oldest || s.donation.createdAt < row.oldest) row.oldest = s.donation.createdAt;
  }

  const unattached = new Map<string, { amount: number; count: number }>();
  for (const a of awards) {
    if (!isFundingSource(a.fundingSource)) continue;
    const cents = toCents(Number(a.awardAmount));
    if (!a.campaignId && !a.drawsFromGeneral) {
      const u = unattached.get(a.fundingSource) ?? { amount: 0, count: 0 };
      u.amount += cents;
      u.count += 1;
      unattached.set(a.fundingSource, u);
      continue;
    }
    const key = a.campaignId ?? GENERAL_POOL;
    const row = get(key, a.fundingSource);
    const campaign = a.campaignId ? byId.get(a.campaignId) : null;
    const inCampaign = campaign
      ? campaign.isSchoolLevel
        ? Boolean(campaign.schoolId) && (a.schoolId === campaign.schoolId || a.student.schoolId === campaign.schoolId)
        : campaign.students.has(a.studentId)
      : false;
    if (inCampaign) row.inCampaign += cents;
    else row.others += cents;
  }

  const rows: CampaignFundRow[] = [...acc.entries()].map(([id, v]) => {
    const [key, source] = id.split("|") as [string, FundingSource];
    const campaign = key === GENERAL_POOL ? null : byId.get(key);
    return {
      key,
      label: campaign?.title ?? (key === GENERAL_POOL ? GENERAL_LABEL : "Deleted campaign"),
      isSchoolLevel: Boolean(campaign?.isSchoolLevel),
      schoolId: campaign?.schoolId ?? null,
      fundingSource: source,
      received: toDollars(v.received),
      awardedInCampaign: toDollars(v.inCampaign),
      awardedToOthers: toDollars(v.others),
      remaining: toDollars(v.received - v.inCampaign - v.others),
      oldestGiftAt: v.oldest?.toISOString() ?? null,
    };
  });
  rows.sort(
    (a, b) =>
      FUNDING_SOURCES.indexOf(a.fundingSource) - FUNDING_SOURCES.indexOf(b.fundingSource) ||
      Number(a.key === GENERAL_POOL) - Number(b.key === GENERAL_POOL) ||
      a.label.localeCompare(b.label),
  );

  return {
    rows,
    unattached: [...unattached.entries()].map(([source, u]) => ({
      fundingSource: source as FundingSource,
      amount: toDollars(u.amount),
      count: u.count,
    })),
    ownCampaigns: (studentId) =>
      campaigns.filter((c) => !c.isSchoolLevel && byId.get(c.id)!.students.has(studentId)).map((c) => c.id),
    schoolCampaigns: (schoolId) =>
      schoolId ? campaigns.filter((c) => c.isSchoolLevel && c.schoolId === schoolId).map((c) => c.id) : [],
  };
}

/** The pots of one fund that awards can draw on. */
export function potsFor(ledger: CampaignLedger, source: FundingSource): FundingPot[] {
  return ledger.rows
    .filter((r) => r.fundingSource === source)
    .map((r) => ({ key: r.key, label: r.label, remaining: r.remaining, oldestGiftAt: r.oldestGiftAt }));
}

/** Campaigns whose donors recommended each student, by student id. */
async function recommendedCampaignsByStudent(studentIds: string[]): Promise<Map<string, string[]>> {
  if (!studentIds.length) return new Map();
  const rows = await prisma.donorRecommendedStudent.findMany({
    where: { studentId: { in: studentIds }, donation: { status: "paid", campaignId: { not: null }, AND: [EXCLUDE_ARCHIVED_TESTS] } },
    select: { studentId: true, donation: { select: { campaignId: true } } },
  });
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.studentId) ?? [];
    if (r.donation.campaignId && !list.includes(r.donation.campaignId)) list.push(r.donation.campaignId);
    map.set(r.studentId, list);
  }
  return map;
}

// ── Recommended remaining for one campaign ───────────────────────────────────

export type CampaignContext = {
  key: string;
  label: string;
  isSchoolLevel: boolean;
  schoolId: string | null;
  schoolName: string | null;
  remaining: number;
  /** The campaign's own students; for a school-level campaign, empty (students at the school are the pool). */
  studentIds: string[];
  recommended: RecommendedResult | null;
};

/** What a campaign has left in a fund, and how donors' recommendations divide it. */
export async function campaignContext(key: string, source: FundingSource, ledger: CampaignLedger): Promise<CampaignContext | null> {
  const row = ledger.rows.find((r) => r.key === key && r.fundingSource === source);
  if (key === GENERAL_POOL) {
    return {
      key,
      label: GENERAL_LABEL,
      isSchoolLevel: false,
      schoolId: null,
      schoolName: null,
      remaining: row?.remaining ?? 0,
      studentIds: [],
      recommended: null,
    };
  }
  const campaign = await prisma.campaign.findUnique({
    where: { id: key },
    select: {
      id: true,
      title: true,
      isSchoolLevel: true,
      schoolId: true,
      school: { select: { name: true } },
      campaignStudents: { orderBy: { sortOrder: "asc" }, select: { studentId: true } },
    },
  });
  if (!campaign) return null;
  const studentIds = campaign.isSchoolLevel ? [] : campaign.campaignStudents.map((cs) => cs.studentId);

  let recommended: RecommendedResult | null = null;
  if (!campaign.isSchoolLevel) {
    const [gifts, awards] = await Promise.all([
      prisma.donationFundSplit.findMany({
        where: { fundingSource: source, donation: { campaignId: key, status: "paid", AND: [EXCLUDE_ARCHIVED_TESTS] } },
        select: { amount: true, donation: { select: { recommendedStudents: { select: { studentId: true } } } } },
      }),
      prisma.scholarshipAward.findMany({
        where: { campaignId: key, fundingSource: source, status: { not: "reversed" } },
        orderBy: { createdAt: "asc" },
        select: { studentId: true, awardAmount: true },
      }),
    ]);
    recommended = recommendedRemaining({
      studentIds,
      gifts: gifts.map((g) => ({
        amount: Number(g.amount),
        recommendedStudentIds: g.donation.recommendedStudents.map((r) => r.studentId),
      })),
      awards: awards.map((a) => ({ studentId: a.studentId, amount: Number(a.awardAmount) })),
    });
  }

  return {
    key,
    label: campaign.title,
    isSchoolLevel: campaign.isSchoolLevel,
    schoolId: campaign.schoolId,
    schoolName: campaign.school?.name ?? null,
    remaining: row?.remaining ?? 0,
    studentIds,
    recommended,
  };
}

// ── Planning: one amount per student, funded from campaigns ──────────────────

export type PlannedAward = {
  studentId: string;
  amount: number;
  lines: FundingLine[];
  /** What no campaign had left to cover. */
  unfunded: number;
};

/**
 * Fund each student's amount automatically: a campaign the admin picked first,
 * then the student's own campaigns, then campaigns whose donors recommended
 * them, then school-level campaigns at their school, then other campaigns with
 * money left (oldest gift first), then the general pool. Students are planned
 * in order against the same balances.
 */
export async function planAwards(
  source: FundingSource,
  entries: { studentId: string; amount: number }[],
  opts: { preferKey?: string | null } = {},
): Promise<PlannedAward[]> {
  const ledger = await campaignLedger();
  const pots = potsFor(ledger, source);
  const students = await prisma.student.findMany({
    where: { id: { in: entries.map((e) => e.studentId) } },
    select: { id: true, schoolId: true },
  });
  const schoolOf = new Map(students.map((s) => [s.id, s.schoolId]));
  const recommended = await recommendedCampaignsByStudent(entries.map((e) => e.studentId));

  return entries.map((entry) => {
    const ordered = fundingOrder(pots, {
      preferKey: opts.preferKey,
      ownKeys: ledger.ownCampaigns(entry.studentId),
      recommendedKeys: recommended.get(entry.studentId) ?? [],
      schoolKeys: ledger.schoolCampaigns(schoolOf.get(entry.studentId) ?? null),
    });
    const { lines, unfunded } = fundFromPots(entry.amount, ordered);
    return { studentId: entry.studentId, amount: round2(entry.amount), lines, unfunded };
  });
}

/** Spread everything a campaign has left in a fund evenly across these students. */
export async function spreadCampaign(source: FundingSource, key: string, studentIds: string[]): Promise<PlannedAward[]> {
  const ledger = await campaignLedger();
  const row = ledger.rows.find((r) => r.key === key && r.fundingSource === source);
  const remaining = Math.max(0, toCents(row?.remaining ?? 0));
  const ids = Array.from(new Set(studentIds));
  const label = row?.label ?? (key === GENERAL_POOL ? GENERAL_LABEL : "Campaign");
  return splitEvenCents(remaining, ids.length).map((cents, i) => ({
    studentId: ids[i],
    amount: toDollars(cents),
    lines: cents > 0 ? [{ key, label, amount: toDollars(cents) }] : [],
    unfunded: 0,
  }));
}

// ── Creating awards as campaign lines ────────────────────────────────────────

export type AwardEntry = {
  studentId: string;
  fundingSource: string;
  schoolYear: string;
  note?: string | null;
  /** One line per campaign the award draws from. `key` is a campaign id or "general". */
  lines: { key: string; amount: number }[];
};

/**
 * Award one student from one fund, drawing from one or more campaigns. Every
 * line names its campaign (or the general pool); each is capped at what that
 * campaign has left in the fund, and the whole at what the fund has left.
 * Eligibility, the ESA hold and later the tuition and cap checks apply as
 * before. The lines are saved together and share an allocation group id.
 */
export async function createAwardLines(actor: AllocationActor, entry: AwardEntry) {
  if (!isFundingSource(entry.fundingSource)) throw new AllocationError("Choose a fund.");
  const source = entry.fundingSource;
  if (!/^\d{4}\/\d{4}$/.test(entry.schoolYear)) throw new AllocationError("Choose a school year.");
  if (source === "corporate_other") {
    throw new AllocationError("Assign these gifts to a corporate program (low-income or disabled/displaced) before awarding them.");
  }
  // Merge repeated campaigns and drop empty lines.
  const merged = new Map<string, number>();
  for (const line of entry.lines ?? []) {
    const key = String(line.key ?? "").trim();
    const cents = toCents(Number(line.amount));
    if (!key || !(cents > 0)) continue;
    merged.set(key, (merged.get(key) ?? 0) + cents);
  }
  const lines = [...merged.entries()].map(([key, cents]) => ({ key, amount: toDollars(cents) }));
  if (lines.length === 0) throw new AllocationError("Choose the campaign each award draws from.");
  const total = toDollars(lines.reduce((s, l) => s + toCents(l.amount), 0));

  const student = await prisma.student.findUnique({
    where: { id: entry.studentId },
    select: { id: true, firstName: true, lastName: true, schoolId: true },
  });
  if (!student) throw new AllocationError("Student not found.", 404);

  const eligibility = await studentEligibility(student.id, entry.schoolYear);
  const ineligible = fundEligibilityError(source, eligibility);
  if (ineligible) throw new AllocationError(ineligible, 422);

  const fund = (await fundBalances()).find((b) => b.fundingSource === source)!;
  const fundProblem = awardAmountError(total, fund.remaining);
  if (fundProblem) throw new AllocationError(fundProblem, 422);

  const ledger = await campaignLedger();
  for (const line of lines) {
    const row = ledger.rows.find((r) => r.key === line.key && r.fundingSource === source);
    if (!row) {
      throw new AllocationError(
        line.key === GENERAL_POOL
          ? "No gifts to this fund were made without a campaign."
          : "That campaign has no gifts to this fund.",
      );
    }
    const problem = awardAmountError(line.amount, Number.POSITIVE_INFINITY, row.remaining);
    if (problem) throw new AllocationError(`${row.label}: ${problem}`, 422);
  }

  const application = await prisma.scholarshipApplication.findFirst({
    where: { studentId: student.id, schoolYear: entry.schoolYear, status: "approved" },
    orderBy: { createdAt: "desc" },
    select: { id: true, schoolId: true },
  });
  // An active ESA no longer holds the award itself: it blocks payment to the
  // school until the ESA is closed (award policy, Oct 16, 2026).
  const groupId = randomUUID();
  const note = entry.note?.trim() || null;

  const created = await prisma.$transaction([
    // The committee's decision record, shared by every line of this award.
    prisma.scholarshipAwardDecision.create({
      data: { id: groupId, studentId: student.id, schoolYear: entry.schoolYear },
    }),
    ...lines.map((line) =>
      prisma.scholarshipAward.create({
        data: {
          studentId: student.id,
          applicationId: application?.id ?? null,
          schoolId: application?.schoolId ?? student.schoolId,
          campaignId: line.key === GENERAL_POOL ? null : line.key,
          drawsFromGeneral: line.key === GENERAL_POOL,
          allocationGroupId: groupId,
          decisionId: groupId,
          fundingSource: source,
          awardAmount: line.amount,
          awardDate: arizonaTodayAsCalendarDate(),
          schoolYear: entry.schoolYear,
          status: "awarded",
          note,
          approvedBy: actor.id,
          createdBy: actor.id,
          createdByEmail: actor.email,
        },
      }),
    ),
  ]).then(([, ...awards]) => awards as Awaited<ReturnType<typeof prisma.scholarshipAward.create>>[]);

  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "award.create",
    entityType: "scholarship_award",
    entityId: created[0].id,
    after: { studentId: student.id, fundingSource: source, total, schoolYear: entry.schoolYear, lines, groupId },
  });
  for (const line of lines) if (line.key !== GENERAL_POOL) await recomputeCampaignAwarded(line.key);
  // The family hears once the committee approves the award (decision record).
  return created;
}

/**
 * Attach an award to a campaign, or move it to another, without reversing it.
 * The new campaign must have the award's amount left in that fund.
 */
export async function setAwardCampaign(actor: AllocationActor, awardId: string, key: string, reason: string) {
  const award = await prisma.scholarshipAward.findUnique({
    where: { id: awardId },
    select: { id: true, campaignId: true, drawsFromGeneral: true, fundingSource: true, awardAmount: true, status: true },
  });
  if (!award) throw new AllocationError("Award not found.", 404);
  if (award.status === "reversed") throw new AllocationError("This award was reversed.");
  if (!isFundingSource(award.fundingSource)) throw new AllocationError("This award has no fund.");
  const currentKey = award.campaignId ?? (award.drawsFromGeneral ? GENERAL_POOL : null);
  if (currentKey === key) return award;

  const ledger = await campaignLedger();
  const row = ledger.rows.find((r) => r.key === key && r.fundingSource === award.fundingSource);
  if (!row) throw new AllocationError("That campaign has no gifts to this fund.");
  const problem = awardAmountError(Number(award.awardAmount), Number.POSITIVE_INFINITY, row.remaining);
  if (problem) throw new AllocationError(`${row.label}: ${problem}`, 422);

  const updated = await prisma.scholarshipAward.update({
    where: { id: awardId },
    data: { campaignId: key === GENERAL_POOL ? null : key, drawsFromGeneral: key === GENERAL_POOL },
  });
  await logAdminActivity({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "award.set_campaign",
    entityType: "scholarship_award",
    entityId: awardId,
    before: { campaignId: award.campaignId, drawsFromGeneral: award.drawsFromGeneral },
    after: { key, reason: reason.trim() || null },
  });
  if (award.campaignId) await recomputeCampaignAwarded(award.campaignId);
  if (key !== GENERAL_POOL) await recomputeCampaignAwarded(key);
  return updated;
}

// ── Backfill: older awards that name no campaign ─────────────────────────────

export type BackfillProposal = {
  awardId: string;
  studentName: string;
  fundingSource: FundingSource;
  fundLabel: string;
  amount: number;
  lines: FundingLine[];
  /** The award has money sent against it, so it can't be split; it goes whole to one campaign. */
  keptWhole: boolean;
  /** Part of the award no campaign had left to cover (shown, not hidden). */
  uncovered: number;
};

/**
 * Attach a campaign to every active award that has none, oldest first, using
 * the same order as new awards. An award that no single campaign can cover is
 * split into lines when nothing has been sent against it yet; otherwise it goes
 * whole to the first campaign in order, and any shortfall shows on that
 * campaign as a negative remaining for an admin to correct. With `apply`
 * false nothing is written.
 */
export async function backfillAwardCampaigns(actor: AllocationActor, apply: boolean): Promise<BackfillProposal[]> {
  const awards = await prisma.scholarshipAward.findMany({
    where: { status: { not: "reversed" }, campaignId: null, drawsFromGeneral: false, fundingSource: { not: null } },
    orderBy: { createdAt: "asc" },
    include: {
      student: { select: { firstName: true, lastName: true, schoolId: true } },
      payments: { where: { status: "sent" }, select: { id: true } },
    },
  });
  if (awards.length === 0) return [];
  const ledger = await campaignLedger();
  const potsBySource = new Map<FundingSource, FundingPot[]>();
  const recommended = await recommendedCampaignsByStudent(awards.map((a) => a.studentId));

  const proposals: BackfillProposal[] = [];
  for (const award of awards) {
    if (!isFundingSource(award.fundingSource)) continue;
    const source = award.fundingSource;
    if (!potsBySource.has(source)) potsBySource.set(source, potsFor(ledger, source));
    const pots = potsBySource.get(source)!;
    const ordered = fundingOrder(pots, {
      ownKeys: ledger.ownCampaigns(award.studentId),
      recommendedKeys: recommended.get(award.studentId) ?? [],
      schoolKeys: ledger.schoolCampaigns(award.schoolId ?? award.student.schoolId),
    });
    const amount = Number(award.awardAmount);
    const keptWhole = award.payments.length > 0;
    let lines: FundingLine[];
    let uncovered = 0;
    if (keptWhole || ordered.length === 0) {
      const target = ordered.find((p) => toCents(p.remaining) >= toCents(amount)) ?? ordered[0];
      if (target) {
        lines = [{ key: target.key, label: target.label, amount }];
        uncovered = toDollars(Math.max(0, toCents(amount) - Math.max(0, toCents(target.remaining))));
        target.remaining = round2(target.remaining - amount);
      } else {
        lines = [];
        uncovered = amount;
      }
    } else {
      const funded = fundFromPots(amount, ordered);
      lines = funded.lines;
      uncovered = funded.unfunded;
      // A shortfall stays on the first campaign rather than leaving the award loose.
      if (uncovered > 0 && lines.length) lines[0] = { ...lines[0], amount: round2(lines[0].amount + uncovered) };
      if (uncovered > 0 && !lines.length && ordered[0]) lines = [{ key: ordered[0].key, label: ordered[0].label, amount }];
    }
    proposals.push({
      awardId: award.id,
      studentName: [award.student.firstName, award.student.lastName].filter(Boolean).join(" "),
      fundingSource: source,
      fundLabel: FUNDING_SOURCE_LABEL[source],
      amount,
      lines,
      keptWhole,
      uncovered,
    });

    if (!apply || lines.length === 0) continue;
    const groupId = award.allocationGroupId ?? randomUUID();
    await prisma.$transaction(async (tx) => {
      const [first, ...rest] = lines;
      await tx.scholarshipAward.update({
        where: { id: award.id },
        data: {
          campaignId: first.key === GENERAL_POOL ? null : first.key,
          drawsFromGeneral: first.key === GENERAL_POOL,
          awardAmount: first.amount,
          allocationGroupId: rest.length ? groupId : award.allocationGroupId,
        },
      });
      for (const line of rest) {
        await tx.scholarshipAward.create({
          data: {
            studentId: award.studentId,
            applicationId: award.applicationId,
            schoolId: award.schoolId,
            campaignId: line.key === GENERAL_POOL ? null : line.key,
            drawsFromGeneral: line.key === GENERAL_POOL,
            allocationGroupId: groupId,
            decisionId: award.decisionId,
            fundingSource: source,
            awardAmount: line.amount,
            awardDate: award.awardDate,
            schoolYear: award.schoolYear,
            status: award.status,
            heldReason: award.heldReason,
            note: award.note,
            approvedBy: award.approvedBy,
            createdBy: award.createdBy,
            createdByEmail: award.createdByEmail,
          },
        });
      }
    });
  }

  if (apply && proposals.length) {
    await logAdminActivity({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "award.backfill_campaigns",
      entityType: "scholarship_award",
      after: { awards: proposals.map((p) => ({ awardId: p.awardId, lines: p.lines, uncovered: p.uncovered })) },
    });
    const touched = new Set(proposals.flatMap((p) => p.lines.map((l) => l.key)).filter((k) => k !== GENERAL_POOL));
    for (const id of touched) await recomputeCampaignAwarded(id);
  }
  return proposals;
}
