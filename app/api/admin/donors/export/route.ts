import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { buildDonorWhere, fetchDonorRows } from "@/lib/donors/server";

export const dynamic = "force-dynamic";

const COLUMNS = ["createdAt", "donorName", "donorEmail", "donorPhone", "campaignTitle", "status", "donationType", "amount", "orderId", "receiptNumber", "taxYear"] as const;

function cell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const where = buildDonorWhere({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    campaignId: url.searchParams.get("campaignId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const rows = await fetchDonorRows(where, { take: 10000 });
  const body = rows.map((r) => COLUMNS.map((c) => cell((r as unknown as Record<string, unknown>)[c])).join(",")).join("\n");
  const csv = [COLUMNS.join(","), body].filter(Boolean).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="donors-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
