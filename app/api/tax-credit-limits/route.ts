import { NextResponse } from "next/server";

import { getTaxCreditLimitConfig } from "@/lib/tax-credit-limits-server";

export async function GET() {
  return NextResponse.json({ limits: await getTaxCreditLimitConfig() });
}
