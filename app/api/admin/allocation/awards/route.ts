import { NextResponse } from "next/server";

import { allocationErrorResponse, requireAllocationActor } from "@/lib/allocation/api";
import { createAwardLines, type AwardEntry } from "@/lib/allocation/campaign-funds";
import { AllocationError } from "@/lib/allocation/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/allocation/awards
 * Body: { awards: [{ studentId, fundingSource, schoolYear, note?, lines: [{ key, amount }] }] }
 *
 * One award per student, saved as one line per campaign it draws from (`key`
 * is a campaign id, or "general" for gifts made without a campaign). Every
 * line must name its campaign. Awards are checked one after another against
 * the balances the earlier ones left; one refusal doesn't undo the others, and
 * the response says which went through and why any didn't.
 */
export async function POST(request: Request) {
  const auth = await requireAllocationActor();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { awards?: AwardEntry[] } | null;
  const awards = Array.isArray(body?.awards) ? body!.awards.slice(0, 200) : [];
  if (awards.length === 0) return NextResponse.json({ error: "Nothing to award." }, { status: 400 });

  const results: { studentId: string; ok: boolean; error?: string; awardIds?: string[] }[] = [];
  for (const input of awards) {
    try {
      const created = await createAwardLines(auth.actor, input);
      results.push({ studentId: input.studentId, ok: true, awardIds: created.map((a) => a.id) });
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
