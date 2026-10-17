import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { DD_GRADE_BANDS, parseMatrixCsv, type DdGradeBand, type MatrixRow } from "@/lib/award-policy/limits";
import { matrixFor, matrixHistory, matrixYears, saveMatrix } from "@/lib/award-policy/limits-server";

export const dynamic = "force-dynamic";

/** GET /api/admin/state-aid-matrix?year= — the year's rows, the years entered, and the change history. */
export async function GET(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  try {
    const year = new URL(request.url).searchParams.get("year") ?? "";
    const [years, rows, history] = await Promise.all([
      matrixYears(),
      /^\d{4}\/\d{4}$/.test(year) ? matrixFor(year) : Promise.resolve([]),
      /^\d{4}\/\d{4}$/.test(year) ? matrixHistory(year) : Promise.resolve([]),
    ]);
    return NextResponse.json({
      years,
      rows,
      history: history.map((h) => ({
        id: h.id,
        action: h.action,
        actorEmail: h.actorEmail,
        note: h.note,
        createdAt: h.createdAt.toISOString(),
        before: Array.isArray(h.before) ? h.before.length : 0,
        after: Array.isArray(h.after) ? h.after.length : 0,
      })),
    });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}

/**
 * POST /api/admin/state-aid-matrix
 *   { year, rows, note } — save the year's matrix as edited
 *   { year, csv, dryRun, note } — import ADOR's spreadsheet saved as CSV
 *
 * Saving replaces the year's rows; the old ones stay in the history.
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as {
    year?: string;
    rows?: { spedCategory?: string; gradeBand?: string; amount90pct?: number | string }[];
    csv?: string;
    dryRun?: boolean;
    note?: string;
  } | null;
  const year = body?.year ?? "";
  if (!/^\d{4}\/\d{4}$/.test(year)) return NextResponse.json({ error: "Choose a school year." }, { status: 400 });

  try {
    if (typeof body?.csv === "string") {
      if (body.csv.length > 500_000) return NextResponse.json({ error: "That file is too large." }, { status: 400 });
      const parsed = parseMatrixCsv(body.csv);
      if (body.dryRun !== false || parsed.errors.length || parsed.rows.length === 0) {
        return NextResponse.json({ preview: parsed.rows, errors: parsed.errors, saved: false });
      }
      const result = await saveMatrix(year, parsed.rows, auth.actor, "import", body.note);
      return NextResponse.json({ preview: parsed.rows, errors: [], saved: true, ...result });
    }

    const bands = DD_GRADE_BANDS.map((b) => b.value) as string[];
    const rows: MatrixRow[] = [];
    const seen = new Set<string>();
    for (const r of body?.rows ?? []) {
      const spedCategory = String(r.spedCategory ?? "").trim().toUpperCase().slice(0, 12);
      const gradeBand = String(r.gradeBand ?? "");
      const amount = Number(String(r.amount90pct ?? "").replace(/[$,\s]/g, ""));
      if (!spedCategory) return NextResponse.json({ error: "Every row needs a category." }, { status: 400 });
      if (!bands.includes(gradeBand)) return NextResponse.json({ error: `${spedCategory}: choose the grade band.` }, { status: 400 });
      if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: `${spedCategory}: enter the amount.` }, { status: 400 });
      const key = `${spedCategory}|${gradeBand}`;
      if (seen.has(key)) return NextResponse.json({ error: `${spedCategory} ${gradeBand} is listed twice.` }, { status: 400 });
      seen.add(key);
      rows.push({ spedCategory, gradeBand: gradeBand as DdGradeBand, amount90pct: Math.round(amount * 100) / 100 });
    }
    const result = await saveMatrix(year, rows, auth.actor, "save", body?.note);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
