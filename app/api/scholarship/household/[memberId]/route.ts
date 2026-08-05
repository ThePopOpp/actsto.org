import { NextResponse } from "next/server";

import { scholarshipErrorResponse } from "@/lib/scholarship/api";
import {
  deleteHouseholdMember,
  listHouseholdMembers,
  parseMemberInput,
  updateHouseholdMember,
} from "@/lib/scholarship/household";
import { householdAnnualTotal } from "@/lib/scholarship/income";
import { requireParentActor } from "@/lib/scholarship/scope";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const parent = await requireParentActor();
    const { memberId } = await params;
    const body = await request.json().catch(() => null);
    const parsed = parseMemberInput(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const member = await updateHouseholdMember(memberId, parent.profileId, parsed.value);
    const members = await listHouseholdMembers(parent.profileId);
    return NextResponse.json({ member, members, annualTotal: householdAnnualTotal(members) });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const parent = await requireParentActor();
    const { memberId } = await params;
    await deleteHouseholdMember(memberId, parent.profileId);

    const members = await listHouseholdMembers(parent.profileId);
    return NextResponse.json({ ok: true, members, annualTotal: householdAnnualTotal(members) });
  } catch (error) {
    return scholarshipErrorResponse(error);
  }
}
