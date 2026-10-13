import { NextResponse } from "next/server";

import { requireAllocationActor } from "@/lib/allocation/api";
import { allocationLedger, fundBalances } from "@/lib/allocation/server";
import { FUNDING_SOURCE_LABEL, isFundingSource } from "@/lib/funding-sources";
import { isoDateInArizona } from "@/lib/format-date";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formulas in exported text.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * GET /api/admin/allocation/export?year=&kind=ledger|reconciliation
 *
 * CSV for ADOR reporting and the annual report: every award with its payments,
 * or the per-fund reconciliation (received, allocated, sent, remaining).
 */
export async function GET(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const year = url.searchParams.get("year") || undefined;
  const kind = url.searchParams.get("kind") === "reconciliation" ? "reconciliation" : "ledger";

  let lines: string[];
  if (kind === "reconciliation") {
    const balances = await fundBalances();
    lines = [
      ["Fund", "Received", "Awaiting review", "Allocated", "Sent to schools", "Remaining (received − allocated)"].join(","),
      ...balances.map((b) =>
        [b.label, b.received, b.needsReview, b.allocated, b.disbursed, b.remaining].map(csvCell).join(","),
      ),
    ];
  } else {
    const awards = await allocationLedger(year);
    lines = [
      [
        "School year",
        "Student",
        "Grade",
        "School",
        "Fund",
        "Award status",
        "Awarded",
        "Sent to school",
        "Payment dates",
        "Payment references",
        "Campaign",
        "Awarded on",
        "Awarded by",
        "Reversal reason",
      ].join(","),
      ...awards.map((a) => {
        const sent = a.payments.filter((p) => p.status === "sent");
        const source = isFundingSource(a.fundingSource) ? FUNDING_SOURCE_LABEL[a.fundingSource] : a.fundingSource;
        return [
          a.schoolYear,
          [a.student.firstName, a.student.lastName].filter(Boolean).join(" "),
          a.student.grade,
          a.school?.name,
          source,
          a.status,
          Number(a.awardAmount),
          sent.reduce((s, p) => s + Number(p.amount), 0),
          sent.map((p) => isoDateInArizona(p.paidAt ?? p.createdAt)).join("; "),
          sent.map((p) => p.paymentReference ?? "").filter(Boolean).join("; "),
          a.campaign?.title,
          isoDateInArizona(a.createdAt),
          a.createdByEmail,
          a.reversalReason,
        ]
          .map(csvCell)
          .join(",");
      }),
    ];
  }

  const name = `${kind === "reconciliation" ? "fund-reconciliation" : "allocations"}${year ? `-${year.replace("/", "-")}` : ""}.csv`;
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
