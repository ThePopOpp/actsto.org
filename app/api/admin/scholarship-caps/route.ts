import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { isFundingSource } from "@/lib/funding-sources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const [caps, history] = await Promise.all([
    prisma.scholarshipCap.findMany({ orderBy: [{ schoolYear: "desc" }, { fundingSource: "asc" }, { gradeBand: "asc" }] }),
    prisma.adminActivityLog.findMany({
      where: { entityType: "scholarship_cap" },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  return NextResponse.json({
    caps: caps.map((c) => ({
      id: c.id,
      fundingSource: c.fundingSource,
      schoolYear: c.schoolYear,
      gradeBand: c.gradeBand,
      amount: Number(c.amount),
      updatedAt: c.updatedAt.toISOString(),
      updatedByEmail: c.updatedByEmail,
    })),
    history: history.map((h) => ({
      at: h.createdAt.toISOString(),
      action: h.action,
      before: h.beforeData,
      after: h.afterData,
    })),
  });
}

/** Add or change one cap: { fundingSource, schoolYear, gradeBand, amount }. */
export async function PUT(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const fundingSource = String(body?.fundingSource ?? "");
  const schoolYear = String(body?.schoolYear ?? "").trim();
  const gradeBand = String(body?.gradeBand ?? "");
  const amount = Number(body?.amount);

  if (!isFundingSource(fundingSource)) return NextResponse.json({ error: "Choose a fund." }, { status: 400 });
  if (!/^\d{4}\/\d{4}$/.test(schoolYear)) return NextResponse.json({ error: "School year must look like 2026/2027." }, { status: 400 });
  if (gradeBand !== "k8" && gradeBand !== "9_12") return NextResponse.json({ error: "Choose a grade band." }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
    return NextResponse.json({ error: "Enter the cap in dollars." }, { status: 400 });
  }

  const key = { fundingSource, schoolYear, gradeBand };
  const before = await prisma.scholarshipCap.findUnique({ where: { fundingSource_schoolYear_gradeBand: key } });
  const cap = await prisma.scholarshipCap.upsert({
    where: { fundingSource_schoolYear_gradeBand: key },
    create: { ...key, amount, updatedByEmail: auth.email },
    update: { amount, updatedByEmail: auth.email },
  });
  await logAdminActivity({
    actorEmail: auth.email,
    action: before ? "scholarship_cap.update" : "scholarship_cap.create",
    entityType: "scholarship_cap",
    entityId: cap.id,
    before: before ? { ...key, amount: Number(before.amount) } : null,
    after: { ...key, amount },
  });
  return NextResponse.json({ ok: true });
}
