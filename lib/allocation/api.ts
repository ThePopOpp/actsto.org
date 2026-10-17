import "server-only";

import { NextResponse } from "next/server";

import { AllocationError, type AllocationActor } from "@/lib/allocation/server";
import { requireSuperAdminApi } from "@/lib/auth/require-super-admin-api";
import { prisma } from "@/lib/prisma";

/**
 * Allocation and disbursement are Super Admin actions. Resolves the acting
 * profile so every award and payment row records who made it.
 */
export async function requireAllocationActor(): Promise<
  { ok: true; actor: AllocationActor } | { ok: false; response: NextResponse }
> {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth;
  const profile = await prisma.profile
    .findFirst({ where: { email: { equals: auth.email, mode: "insensitive" } }, select: { id: true } })
    .catch(() => null);
  return { ok: true, actor: { id: profile?.id ?? null, email: auth.email } };
}

export function allocationErrorResponse(error: unknown) {
  if (error instanceof AllocationError) {
    // A payment over tuition once other STOs are counted can go ahead with a reason.
    const needsReason = error.name === "NeedsReasonError";
    return NextResponse.json({ error: error.message, ...(needsReason ? { needsReason: true } : {}) }, { status: error.status });
  }
  console.error("[allocation]", error);
  return NextResponse.json({ error: "Something went wrong. Nothing was saved." }, { status: 500 });
}
