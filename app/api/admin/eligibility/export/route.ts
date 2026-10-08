import { NextResponse } from "next/server";

import { requireAllocationActor } from "@/lib/allocation/api";
import { FLAG_LABEL, FLAG_STATUS_LABEL, isEligibilityFlag, isFlagStatus } from "@/lib/eligibility/flags";
import { listEligibility } from "@/lib/eligibility/list-server";

export const dynamic = "force-dynamic";

function cell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** GET /api/admin/eligibility/export?flag=&status=&year=&noAward=1 — CSV for ADOR reporting. */
export async function GET(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const rows = await listEligibility({
    flag: url.searchParams.get("flag") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    year: url.searchParams.get("year") ?? undefined,
    noAward: url.searchParams.get("noAward") === "1",
  });
  const lines = [
    ["Student", "School", "Grade", "Flag", "School year", "Status", "Set by", "Decided", "Decided by", "Reason", "Awarded (year)"].join(","),
    ...rows.map((r) =>
      [
        r.studentName,
        r.schoolName,
        r.grade,
        isEligibilityFlag(r.flag) ? FLAG_LABEL[r.flag] : r.flag,
        r.schoolYear,
        isFlagStatus(r.status) ? FLAG_STATUS_LABEL[r.status] : r.status,
        r.source,
        r.decidedAt?.slice(0, 10),
        r.decidedByEmail,
        r.reason,
        r.awardedThisYear,
      ]
        .map(cell)
        .join(","),
    ),
  ];
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="eligibility.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
