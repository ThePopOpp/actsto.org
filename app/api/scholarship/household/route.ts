import { NextResponse } from "next/server";

import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import {
  createHouseholdMember,
  householdLastUpdated,
  listHouseholdMembers,
  parseMemberInput,
} from "@/lib/scholarship/household";
import { householdAnnualTotal } from "@/lib/scholarship/income";
import { requireParentActor } from "@/lib/scholarship/scope";

export async function GET() {
  try {
    const parent = await requireParentActor();
    const members = await listHouseholdMembers(parent.profileId);
    const lastUpdated = await householdLastUpdated(parent.profileId);
    return NextResponse.json({
      members,
      annualTotal: householdAnnualTotal(members),
      lastUpdated: lastUpdated?.toISOString() ?? null,
    });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const parent = await requireParentActor();
    const body = await request.json().catch(() => null);
    const parsed = parseMemberInput(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const member = await createHouseholdMember(parent.profileId, parsed.value);
    const members = await listHouseholdMembers(parent.profileId);
    return NextResponse.json({
      member,
      members,
      annualTotal: householdAnnualTotal(members),
    });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
