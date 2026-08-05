import "server-only";

import type { HouseholdMember } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  isIncomeFrequency,
  type HouseholdMemberInput,
  type HouseholdMemberView,
  type IncomeFrequency,
} from "@/lib/scholarship/income";
import { ScopeError } from "@/lib/scholarship/scope";

/**
 * Household income, owned by the parent — not by an application.
 *
 * The wizard's financial step and the standalone income page both call these
 * functions against the same rows. That shared ownership is the single most
 * important integration point in this feature: a parent who edits income inside
 * the wizard sees it on the standalone page, and the reverse.
 */

const MAX_AMOUNT = 9_999_999.99;

export function toMemberView(row: HouseholdMember): HouseholdMemberView {
  return {
    id: row.id,
    fullName: row.fullName,
    roleLabel: row.roleLabel,
    workAmount: Number(row.workAmount),
    workFrequency: row.workFrequency as IncomeFrequency,
    supportAmount: Number(row.supportAmount),
    supportFrequency: row.supportFrequency as IncomeFrequency,
    retirementAmount: Number(row.retirementAmount),
    retirementFrequency: row.retirementFrequency as IncomeFrequency,
    otherAmount: Number(row.otherAmount),
    otherFrequency: row.otherFrequency as IncomeFrequency,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listHouseholdMembers(parentId: string): Promise<HouseholdMemberView[]> {
  const rows = await prisma.householdMember.findMany({
    where: { parentId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toMemberView);
}

export async function householdLastUpdated(parentId: string): Promise<Date | null> {
  const row = await prisma.householdMember.findFirst({
    where: { parentId },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  return row?.updatedAt ?? null;
}

// ── Validation ───────────────────────────────────────────────────────────────

export type ParsedMember = HouseholdMemberInput;

/** Parse untrusted JSON into a member. Every write path goes through this. */
export function parseMemberInput(body: unknown): { ok: true; value: ParsedMember } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Nothing to save." };
  const raw = body as Record<string, unknown>;

  const fullName = typeof raw.fullName === "string" ? raw.fullName.trim() : "";
  if (!fullName) return { ok: false, error: "Enter a name for this person." };
  if (fullName.length > 120) return { ok: false, error: "That name is too long." };

  const roleLabelRaw = typeof raw.roleLabel === "string" ? raw.roleLabel.trim() : "";
  const roleLabel = roleLabelRaw ? roleLabelRaw.slice(0, 80) : null;

  const readAmount = (key: string): number | { error: string } => {
    const value = raw[key];
    if (value === undefined || value === null || value === "") return 0;
    const num = typeof value === "number" ? value : Number(String(value).replace(/[$,\s]/g, ""));
    if (!Number.isFinite(num)) return { error: "Enter income as a number." };
    if (num < 0) return { error: "Income can't be negative." };
    if (num > MAX_AMOUNT) return { error: "That amount is larger than this form accepts." };
    return Math.round(num * 100) / 100;
  };

  const readFrequency = (key: string): IncomeFrequency | { error: string } => {
    const value = raw[key];
    if (value === undefined || value === null || value === "") return "annually";
    if (!isIncomeFrequency(value)) return { error: "Pick how often that income is received." };
    return value;
  };

  const fields: Record<string, number | IncomeFrequency> = {};
  for (const key of [
    "workAmount",
    "supportAmount",
    "retirementAmount",
    "otherAmount",
  ] as const) {
    const parsed = readAmount(key);
    if (typeof parsed === "object") return { ok: false, error: parsed.error };
    fields[key] = parsed;
  }
  for (const key of [
    "workFrequency",
    "supportFrequency",
    "retirementFrequency",
    "otherFrequency",
  ] as const) {
    const parsed = readFrequency(key);
    if (typeof parsed === "object") return { ok: false, error: parsed.error };
    fields[key] = parsed;
  }

  return {
    ok: true,
    value: {
      fullName,
      roleLabel,
      workAmount: fields.workAmount as number,
      workFrequency: fields.workFrequency as IncomeFrequency,
      supportAmount: fields.supportAmount as number,
      supportFrequency: fields.supportFrequency as IncomeFrequency,
      retirementAmount: fields.retirementAmount as number,
      retirementFrequency: fields.retirementFrequency as IncomeFrequency,
      otherAmount: fields.otherAmount as number,
      otherFrequency: fields.otherFrequency as IncomeFrequency,
    },
  };
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Any change to the household clears the income confirmation on every
 * application the parent can still edit.
 *
 * Adding a member while a stale "I confirm this income is accurate" sits on the
 * record is precisely the failure that check guards against. Submitted
 * applications are deliberately untouched — they keep the figures that were
 * certified, and their snapshot is frozen regardless.
 */
async function clearIncomeConfirmations(parentId: string): Promise<void> {
  await prisma.scholarshipApplication.updateMany({
    where: {
      guardianUserId: parentId,
      status: { in: ["draft", "needs_info"] },
      incomeConfirmedAt: { not: null },
    },
    data: { incomeConfirmedAt: null, incomeConfirmedBy: null },
  });
}

export async function createHouseholdMember(
  parentId: string,
  input: ParsedMember,
): Promise<HouseholdMemberView> {
  const count = await prisma.householdMember.count({ where: { parentId } });
  if (count >= 30) {
    throw new ScopeError("That's more household members than this form supports. Contact our team.", 400);
  }

  const row = await prisma.householdMember.create({
    data: { parentId, sortOrder: count, ...input },
  });
  await clearIncomeConfirmations(parentId);
  return toMemberView(row);
}

export async function updateHouseholdMember(
  memberId: string,
  parentId: string,
  input: ParsedMember,
): Promise<HouseholdMemberView> {
  const existing = await prisma.householdMember.findFirst({
    where: { id: memberId, parentId },
    select: { id: true },
  });
  if (!existing) throw new ScopeError("That household member wasn't found.", 404);

  const row = await prisma.householdMember.update({
    where: { id: memberId },
    data: input,
  });
  await clearIncomeConfirmations(parentId);
  return toMemberView(row);
}

export async function deleteHouseholdMember(memberId: string, parentId: string): Promise<void> {
  const existing = await prisma.householdMember.findFirst({
    where: { id: memberId, parentId },
    select: { id: true },
  });
  if (!existing) throw new ScopeError("That household member wasn't found.", 404);

  await prisma.householdMember.delete({ where: { id: memberId } });
  await clearIncomeConfirmations(parentId);
}
