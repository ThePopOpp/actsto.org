import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getStudentActor } from "@/lib/students/parent-session";
import { notifyStudentsMissingFromCampaigns } from "@/lib/students/notifications";
import {
  createFamilyStudent,
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

/** Every student on the signed-in family's account. */
export async function GET() {
  const actor = await getStudentActor();
  if (!actor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const students = await listFamilyStudents(actor.id);
  return NextResponse.json({ students: students.map(serializeFamilyStudent) });
}

/**
 * Add a child to the account on its own — no campaign required.
 *
 * Adding a second student used to mean walking the whole four-step campaign
 * wizard again, which both buried the action and created a duplicate campaign
 * nobody wanted. A student can now exist first and be attached to campaigns
 * afterwards.
 */
export async function POST(request: Request) {
  const actor = await getStudentActor();
  if (!actor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const firstName = text(body?.firstName);
  if (!firstName) {
    return NextResponse.json({ error: "A first name is required to add a student." }, { status: 400 });
  }

  const requestedSchoolId = text(body?.schoolId) || null;
  const schoolId = requestedSchoolId
    ? (await prisma.school.findUnique({ where: { id: requestedSchoolId }, select: { id: true } }))?.id ?? null
    : null;

  const created = await prisma.$transaction((tx) =>
    createFamilyStudent(tx, actor.id, {
      firstName,
      lastName: text(body?.lastName),
      nickname: text(body?.nickname),
      grade: text(body?.grade),
      birthDate: birthDate(body?.birthDate),
      profilePhotoUrl: text(body?.photo),
      schoolId,
      phone: actor.phone,
    }),
  );

  await notifyStudentsMissingFromCampaigns(actor.id).catch(() => null);

  const students = await listFamilyStudents(actor.id);
  const student = students.find((row) => row.id === created.id);
  return NextResponse.json(
    { ok: true, student: student ? serializeFamilyStudent(student) : null },
    { status: 201 },
  );
}
