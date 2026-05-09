import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { getAllCtaBlocks } from "@/lib/site-cta-blocks";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const blocks = await getAllCtaBlocks();
  return NextResponse.json({ blocks });
}
