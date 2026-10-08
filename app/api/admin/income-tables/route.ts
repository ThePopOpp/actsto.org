import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/audit";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { readIncomeRows, validateIncomeTable, type IncomeTable } from "@/lib/eligibility/income-table";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const rows = await prisma.lowIncomeTable.findMany({ orderBy: { schoolYear: "desc" } });
  return NextResponse.json({
    tables: rows.map((row) => ({
      schoolYear: row.schoolYear,
      rows: readIncomeRows(row.rows),
      additionalBase: Number(row.additionalBase),
      additionalMax: Number(row.additionalMax),
      sourceNote: row.sourceNote,
      updatedAt: row.updatedAt.toISOString(),
      updatedByEmail: row.updatedByEmail,
    })),
  });
}

/**
 * Save one school year's table. Refused unless every row passes the ×1.85 and
 * per-member step checks, so a typo can't reach an eligibility decision.
 */
export async function PUT(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as Partial<IncomeTable> | null;
  if (!body) return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });

  const table: IncomeTable = {
    schoolYear: String(body.schoolYear ?? "").trim(),
    rows: readIncomeRows(body.rows).map((r) => ({
      householdSize: r.householdSize,
      base185: Math.round(r.base185),
      maxIncome: Math.round(r.maxIncome),
    })),
    additionalBase: Math.round(Number(body.additionalBase ?? 0)),
    additionalMax: Math.round(Number(body.additionalMax ?? 0)),
    sourceNote: typeof body.sourceNote === "string" ? body.sourceNote.trim().slice(0, 1000) : null,
  };
  const errors = validateIncomeTable(table);
  if (errors.length) return NextResponse.json({ error: errors.join(" "), errors }, { status: 422 });

  const before = await prisma.lowIncomeTable.findUnique({ where: { schoolYear: table.schoolYear } });
  const data = {
    rows: table.rows,
    additionalBase: table.additionalBase,
    additionalMax: table.additionalMax,
    sourceNote: table.sourceNote,
    updatedByEmail: auth.email,
  };
  await prisma.lowIncomeTable.upsert({
    where: { schoolYear: table.schoolYear },
    create: { schoolYear: table.schoolYear, ...data },
    update: data,
  });
  await logAdminActivity({
    actorEmail: auth.email,
    action: before ? "income_table.update" : "income_table.create",
    entityType: "low_income_table",
    entityId: table.schoolYear,
    before: before ? { rows: before.rows, additionalBase: Number(before.additionalBase), additionalMax: Number(before.additionalMax) } : null,
    after: data,
  });
  return NextResponse.json({ ok: true });
}
