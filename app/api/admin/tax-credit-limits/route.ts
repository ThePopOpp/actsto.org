import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TAX_CREDIT_LIMITS,
  type FilingStatus,
  type TaxCreditLimitConfig,
  type TaxYear,
} from "@/lib/tax-credit";
import { getTaxCreditLimitConfig } from "@/lib/tax-credit-limits-server";

const TAX_YEARS: TaxYear[] = ["2025", "2026"];
const FILING_STATUSES: FilingStatus[] = ["single", "married"];

function numberField(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} must be a positive number.`);
  return parsed;
}

function normalizeLimits(input: unknown): TaxCreditLimitConfig {
  if (!input || typeof input !== "object") throw new Error("Limits payload is required.");
  const raw = input as Record<string, Record<string, Record<string, unknown>>>;
  const next: TaxCreditLimitConfig = structuredClone(DEFAULT_TAX_CREDIT_LIMITS);

  for (const year of TAX_YEARS) {
    for (const filing of FILING_STATUSES) {
      const row = raw[year]?.[filing];
      if (!row || typeof row !== "object") continue;
      const original = numberField(row.original, `${year} ${filing} original`);
      const overflow = numberField(row.overflow, `${year} ${filing} overflow`);
      const combined = numberField(row.combined, `${year} ${filing} combined`);
      if (Math.round((original + overflow) * 100) !== Math.round(combined * 100)) {
        throw new Error(`${year} ${filing} original plus overflow must equal the combined limit.`);
      }
      next[year][filing] = { original, overflow, combined };
    }
  }

  return next;
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const [limits, rows] = await Promise.all([
    getTaxCreditLimitConfig(),
    prisma.taxCreditLimit.findMany({ orderBy: [{ taxYear: "desc" }, { filingStatus: "asc" }] }).catch(() => []),
  ]);

  return NextResponse.json({
    limits,
    metadata: rows.map((row) => ({
      taxYear: row.taxYear,
      filingStatus: row.filingStatus,
      sourceUrl: row.sourceUrl ?? "",
      notes: row.notes ?? "",
      effectiveStartDate: row.effectiveStartDate?.toISOString().slice(0, 10) ?? "",
      effectiveEndDate: row.effectiveEndDate?.toISOString().slice(0, 10) ?? "",
    })),
  });
}

export async function PUT(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    limits?: unknown;
    sourceUrl?: string;
    notes?: string;
  } | null;

  let limits: TaxCreditLimitConfig;
  try {
    limits = normalizeLimits(body?.limits);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid tax credit limits." },
      { status: 400 },
    );
  }

  const sourceUrl = typeof body?.sourceUrl === "string" ? body.sourceUrl.trim().slice(0, 1024) : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 2048) : "";

  await prisma.$transaction(
    TAX_YEARS.flatMap((year) =>
      FILING_STATUSES.map((filing) =>
        prisma.taxCreditLimit.upsert({
          where: { taxYear_filingStatus: { taxYear: Number(year), filingStatus: filing } },
          create: {
            taxYear: Number(year),
            filingStatus: filing,
            originalCreditLimit: limits[year][filing].original,
            overflowCreditLimit: limits[year][filing].overflow,
            combinedLimit: limits[year][filing].combined,
            effectiveStartDate: new Date(`${year}-01-01T00:00:00.000Z`),
            sourceUrl: sourceUrl || null,
            notes: notes || null,
          },
          update: {
            originalCreditLimit: limits[year][filing].original,
            overflowCreditLimit: limits[year][filing].overflow,
            combinedLimit: limits[year][filing].combined,
            sourceUrl: sourceUrl || null,
            notes: notes || null,
          },
        }),
      ),
    ),
  );

  return NextResponse.json({ ok: true, limits: await getTaxCreditLimitConfig() });
}
