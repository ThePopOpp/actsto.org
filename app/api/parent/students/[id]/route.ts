import { NextResponse } from "next/server";

import { recomputeCampaignCompletion } from "@/lib/campaigns/recompute-completion";
import { prisma } from "@/lib/prisma";
import { getStudentActor } from "@/lib/students/parent-session";
import {
  campaignIdsForStudent,
  familyStudentWhere,
  findStudentDeleteBlock,
  listFamilyStudents,
  serializeFamilyStudent,
} from "@/lib/students/parent-students";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function birthDate(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(`${raw}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Edit one of the family's students without opening a campaign. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await getStudentActor();
  if (!actor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const owned = await prisma.student.findFirst({
    where: { id, ...familyStudentWhere(actor.id) },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const firstName = text(body.firstName);
  if ("firstName" in body && !firstName) {
    return NextResponse.json({ error: "A first name is required." }, { status: 400 });
  }

  const requestedSchoolId = text(body.schoolId);
  const schoolId = requestedSchoolId
    ? (await prisma.school.findUnique({ where: { id: requestedSchoolId }, select: { id: true } }))?.id ?? null
    : null;

  await prisma.student.update({
    where: { id },
    data: {
      ...(firstName ? { firstName } : {}),
      ...("lastName" in body ? { lastName: text(body.lastName) || null } : {}),
      ...("nickname" in body ? { nickname: text(body.nickname) || null } : {}),
      ...("grade" in body ? { grade: text(body.grade) || null } : {}),
      ...("birthDate" in body ? { birthDate: birthDate(body.birthDate) } : {}),
      ...("photo" in body ? { profilePhotoUrl: text(body.photo) || null } : {}),
      ...("schoolId" in body ? { schoolId } : {}),
    },
  });

  const students = await listFamilyStudents(actor.id);
  const student = students.find((row) => row.id === id);
  return NextResponse.json({ ok: true, student: student ? serializeFamilyStudent(student) : null });
}

/**
 * Remove a student from the family's account entirely.
 *
 * Campaign links and guardian links go with them. Anything that represents
 * money or a scholarship decision blocks the delete instead — see
 * {@link findStudentDeleteBlock} — and the parent is told to take the student
 * off the campaign rather than out of the account.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const actor = await getStudentActor();
  if (!actor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const owned = await prisma.student.findFirst({
    where: { id, ...familyStudentWhere(actor.id) },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!owned) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const result = await prisma.$transaction(async (tx) => {
    const block = await findStudentDeleteBlock(tx, id);
    if (block) return { blocked: block, campaignIds: [] as string[] };

    const campaignIds = await campaignIdsForStudent(tx, id);
    await tx.student.delete({ where: { id } });
    return { blocked: null, campaignIds };
  });

  if (result.blocked) {
    return NextResponse.json({ error: result.blocked.reason, counts: result.blocked.counts }, { status: 409 });
  }

  // Their campaigns may now be missing the student details review requires.
  for (const campaignId of result.campaignIds) {
    await recomputeCampaignCompletion(campaignId).catch(() => null);
  }

  const name = [owned.firstName, owned.lastName].filter(Boolean).join(" ");
  return NextResponse.json({ ok: true, removed: { id, name } });
}
