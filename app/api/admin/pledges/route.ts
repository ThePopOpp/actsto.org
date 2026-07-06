import { NextResponse } from "next/server";

import { listInvoiceablePledges } from "@/lib/admin/invoices";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const pledges = await listInvoiceablePledges();
  return NextResponse.json({ pledges });
}
