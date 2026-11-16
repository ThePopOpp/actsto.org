import "server-only";

import { randomBytes } from "node:crypto";

import { activityDay } from "@/lib/dashboard/campaign-activity";
import { prisma } from "@/lib/prisma";
import { TOKEN_PATTERN, type Signer } from "@/lib/proposals/musk-scholars-fund/content";

/**
 * Private donor proposals: the secret link, its on/off switch, the signer,
 * and view counts. The proposal copy lives in code; see
 * lib/proposals/musk-scholars-fund/content.ts.
 */

/** 16 URL-safe characters (96 bits): not guessable, short enough to read aloud. */
export function newProposalToken(): string {
  return randomBytes(12).toString("base64url");
}

export async function getOrCreateProposal(key: string) {
  const existing = await prisma.donorProposal.findUnique({ where: { key } });
  if (existing) return existing;
  return prisma.donorProposal.upsert({
    where: { key },
    create: { key, token: newProposalToken() },
    update: {},
  });
}

/** The proposal behind a live link, or null (unknown, malformed or switched off). */
export async function findEnabledByToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const row = await prisma.donorProposal.findUnique({ where: { token } }).catch(() => null);
  return row?.enabled ? row : null;
}

export function signerOf(row: { signerName: string | null; signerTitle: string | null; signerPhone: string | null; signerEmail: string | null }): Signer {
  return { name: row.signerName, title: row.signerTitle, phone: row.signerPhone, email: row.signerEmail };
}

export function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://actsto.org").replace(/\/$/, "");
}

export function proposalUrl(token: string): string {
  return `${siteBase()}/p/${token}`;
}

/** Once per visitor per day; a repeat is the unique index saying "already counted". */
export async function recordProposalView(proposalId: string, hash: string, day: string, referrer: string | null) {
  await prisma.donorProposalView
    .create({
      data: { proposalId, visitorHash: hash, viewedOn: new Date(`${day}T00:00:00Z`), referrer: referrer?.slice(0, 300) ?? null },
    })
    .catch(() => {
      /* already counted today, or analytics failed: never break the page */
    });
}

export async function proposalViewStats(proposalId: string) {
  const today = activityDay();
  const since = new Date(`${today}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 13);
  const [total, last, recent] = await Promise.all([
    prisma.donorProposalView.count({ where: { proposalId } }),
    prisma.donorProposalView.findFirst({ where: { proposalId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.donorProposalView.groupBy({
      by: ["viewedOn"],
      where: { proposalId, viewedOn: { gte: since } },
      _count: { _all: true },
    }),
  ]);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const hit = recent.find((r) => r.viewedOn.toISOString().slice(0, 10) === key);
    return { day: key, views: hit?._count._all ?? 0 };
  });
  return { total, lastViewedAt: last?.createdAt.toISOString() ?? null, days };
}
