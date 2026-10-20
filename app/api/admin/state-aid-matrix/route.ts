import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { ddCapSnapshot } from "@/lib/allocation/server";
import {
  checkMatrix,
  compareMatrices,
  DD_GRADE_BANDS,
  emptyAmounts,
  isRegularEducationLabel,
  parseAdorMatrix,
  parseCodes,
  schoolYearFromFileName,
  type MatrixRow,
} from "@/lib/award-policy/limits";
import {
  codeAliases,
  knownMatrixCodes,
  matrixFor,
  matrixHistory,
  matrixSourceFile,
  matrixYears,
  priorMatrix,
  recordCapChanges,
  saveMatrix,
  type CapChange,
} from "@/lib/award-policy/limits-server";
import { parseCsv } from "@/lib/csv";
import { readFirstSheet } from "@/lib/xlsx-read";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;
const YEAR = /^\d{4}\/\d{4}$/;

/**
 * GET /api/admin/state-aid-matrix?year=          the year's rows, the prior year's, years entered, history
 * GET /api/admin/state-aid-matrix?file=<eventId>  download the ADOR file saved with that version
 */
export async function GET(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const fileEvent = url.searchParams.get("file");
    if (fileEvent) {
      const source = await matrixSourceFile(fileEvent);
      if (!source?.sourceFile) return NextResponse.json({ error: "No file was saved with that version." }, { status: 404 });
      return new Response(new Uint8Array(source.sourceFile), {
        headers: {
          "Content-Type": source.sourceMimeType ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename="${(source.sourceFileName ?? "state-aid-matrix").replace(/[^\w.\- ]/g, "_")}"`,
          "Cache-Control": "no-store",
        },
      });
    }
    const year = url.searchParams.get("year") ?? "";
    const ok = YEAR.test(year);
    const [years, rows, prior, history, known] = await Promise.all([
      matrixYears(),
      ok ? matrixFor(year) : Promise.resolve([]),
      ok ? priorMatrix(year) : Promise.resolve({ schoolYear: null, rows: [] }),
      ok ? matrixHistory(year) : Promise.resolve([]),
      knownMatrixCodes(),
    ]);
    return NextResponse.json({
      years,
      rows,
      prior,
      knownCodes: known,
      history: history.map((h) => ({
        id: h.id,
        action: h.action,
        actorEmail: h.actorEmail,
        note: h.note,
        fileName: h.sourceFileName,
        createdAt: h.createdAt.toISOString(),
        before: Array.isArray(h.before) ? h.before.length : 0,
        after: Array.isArray(h.after) ? h.after.length : 0,
        capChanges: Array.isArray(h.capChanges) ? h.capChanges : [],
      })),
    });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}

/** Rows from the editor or the import preview, checked field by field. */
function rowsFromBody(raw: unknown): MatrixRow[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, 100).map((r) => {
    const row = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    const amountsIn = (row.amounts && typeof row.amounts === "object" ? row.amounts : {}) as Record<string, unknown>;
    const amounts = emptyAmounts();
    for (const band of DD_GRADE_BANDS) {
      const v = amountsIn[band.value];
      if (v === null || v === undefined || v === "") continue;
      const n = Number(String(v).replace(/[$,\s]/g, ""));
      amounts[band.value] = Number.isFinite(n) ? Math.round(n * 100) / 100 : Number.NaN;
    }
    const rowLabel = String(row.rowLabel ?? "").trim().slice(0, 300);
    const isRegularEducation = row.isRegularEducation === true || isRegularEducationLabel(rowLabel);
    const codes = Array.isArray(row.codes) ? parseCodes(row.codes.join(",")) : parseCodes(String(row.codes ?? ""));
    return { rowLabel, codes: isRegularEducation ? ["REG"] : codes, isRegularEducation, amounts };
  });
}

async function preview(year: string, rows: MatrixRow[], parseErrors: string[] = []) {
  const [prior, known] = await Promise.all([priorMatrix(year), knownMatrixCodes()]);
  const check = checkMatrix(rows, known);
  return {
    rows,
    errors: [...parseErrors, ...check.errors],
    warnings: check.warnings,
    priorYear: prior.schoolYear,
    changes: compareMatrices(prior.rows, rows),
  };
}

/**
 * POST multipart { file, year? }               read ADOR's CSV or XLSX for a preview (nothing saved)
 * POST json { year, rows, note, acknowledgeWarnings, action: "import"|"save", fileToken? }
 *                                              save the whole year; recalculates every cap
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("multipart/form-data")) {
      const form = await request.formData().catch(() => null);
      const file = form?.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Choose ADOR's matrix file." }, { status: 400 });
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is too large for a state aid matrix." }, { status: 400 });
      const bytes = new Uint8Array(await file.arrayBuffer());
      const isXlsx = /\.xlsx$/i.test(file.name) || file.type.includes("spreadsheetml");
      let table: string[][];
      try {
        table = isXlsx ? readFirstSheet(bytes) : parseCsv(new TextDecoder("utf-8").decode(bytes));
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "That file couldn't be read." }, { status: 400 });
      }
      const suggestedYear = schoolYearFromFileName(file.name);
      const year = String(form?.get("year") ?? "") || suggestedYear || "";
      const parsed = parseAdorMatrix(table, await codeAliases());
      return NextResponse.json({
        suggestedYear,
        year,
        ...(YEAR.test(year) ? await preview(year, parsed.rows, parsed.errors) : { rows: parsed.rows, errors: parsed.errors, warnings: [], changes: [], priorYear: null }),
        file: { name: file.name.slice(0, 200), mimeType: isXlsx ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv", base64: Buffer.from(bytes).toString("base64") },
      });
    }

    const body = (await request.json().catch(() => null)) as {
      year?: string;
      rows?: unknown;
      note?: string;
      action?: string;
      acknowledgeWarnings?: boolean;
      dryRun?: boolean;
      file?: { name?: string; mimeType?: string; base64?: string } | null;
    } | null;
    const year = body?.year ?? "";
    if (!YEAR.test(year)) return NextResponse.json({ error: "Choose the school year." }, { status: 400 });
    const rows = rowsFromBody(body?.rows);
    const check = await preview(year, rows);
    if (body?.dryRun) return NextResponse.json(check);
    if (check.errors.length) return NextResponse.json({ error: check.errors[0], ...check }, { status: 422 });
    if (check.warnings.length && !body?.acknowledgeWarnings) {
      return NextResponse.json({ error: "Check the warnings and confirm before saving.", needsAcknowledgment: true, ...check }, { status: 409 });
    }
    const bytes = body?.file?.base64 ? Buffer.from(body.file.base64, "base64") : null;
    if (bytes && bytes.length > MAX_BYTES) return NextResponse.json({ error: "That file is too large." }, { status: 400 });

    const before = await ddCapSnapshot(year);
    const result = await saveMatrix(year, rows, auth.actor, body?.action === "import" ? "import" : "save", {
      note: body?.note,
      source: bytes ? { fileName: String(body?.file?.name ?? "state-aid-matrix"), mimeType: String(body?.file?.mimeType ?? "application/octet-stream"), bytes } : null,
    });
    const after = await ddCapSnapshot(year);
    const changes: CapChange[] = [];
    for (const [studentId, now] of after) {
      const was = before.get(studentId);
      if (!was || was.cap !== now.cap || was.problem !== now.problem) {
        changes.push({ studentId, name: now.name, before: was?.cap ?? null, after: now.cap, problem: now.problem });
      }
    }
    await recordCapChanges(result.eventId, changes);
    return NextResponse.json({ ok: true, ...result, capChanges: changes });
  } catch (error) {
    return allocationErrorResponse(error);
  }
}
