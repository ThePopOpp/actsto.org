import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { AllocationError, createAward, type CreateAwardInput } from "@/lib/allocation/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/allocation/awards
 * Body: { awards: CreateAwardInput[] } — confirmed in bulk.
 *
 * Each award is checked on its own, in order, against the fund balance left
 * after the ones before it. One refusal doesn't undo the others; the response
 * says which went through and why any didn't.
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { awards?: CreateAwardInput[] } | null;
  const awards = Array.isArray(body?.awards) ? body!.awards.slice(0, 200) : [];
  if (awards.length === 0) return NextResponse.json({ error: "Nothing to award." }, { status: 400 });

  const results: { studentId: string; ok: boolean; error?: string; awardId?: string }[] = [];
  for (const input of awards) {
    try {
      const award = await createAward(auth.actor, input);
      results.push({ studentId: input.studentId, ok: true, awardId: award.id });
    } catch (error) {
      if (error instanceof AllocationError) {
        results.push({ studentId: input.studentId, ok: false, error: error.message });
      } else {
        return allocationErrorResponse(error);
      }
    }
  }
  return NextResponse.json({ results });
}
