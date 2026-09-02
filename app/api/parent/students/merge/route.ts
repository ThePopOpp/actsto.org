import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { recomputeCampaignCompletion } from "@/lib/campaigns/recompute-completion";
import { prisma } from "@/lib/prisma";
import { getStudentActor } from "@/lib/students/parent-session";
import {
  familyStudentWhere,
  findStudentDeleteBlock,
  listFamilyStudents,
  serializeFamilyStudent,
} from "@/lib/students/parent-students";

/**
 * Fold duplicate student records into one.
 *
 * Campaign creation used to mint a new student row for every campaign, so a
 * family running two campaigns for the same child has that child stored twice.
 * The parent picks which record to keep; every campaign the duplicates were on
 * moves to the keeper, blank details on the keeper are filled in from the
 * duplicates, and the duplicates are deleted.
 *
 * A duplicate carrying donations or scholarship history is never deleted — its
 * campaign links still move to the keeper, and the record is reported back as
 * kept so the parent knows why it is still listed.
 */
export async function POST(request: Request) {
  const actor = await getStudentActor();
  if (!actor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { keepId?: string; mergeIds?: string[] }
    | null;
  const keepId = (body?.keepId ?? "").trim();
  const mergeIds = [...new Set((body?.mergeIds ?? []).map((id) => String(id).trim()).filter(Boolean))].filter(
    (id) => id !== keepId,
  );

  if (!keepId || mergeIds.length === 0) {
    return NextResponse.json({ error: "Pick the record to keep and at least one to merge." }, { status: 400 });
  }

  const owned = await prisma.student.findMany({
    where: { id: { in: [keepId, ...mergeIds] }, ...familyStudentWhere(actor.id) },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((student) => student.id));
  if (!ownedIds.has(keepId) || mergeIds.some((id) => !ownedIds.has(id))) {
    return NextResponse.json({ error: "Those students are not all on your account." }, { status: 404 });
  }

  const outcome = await prisma.$transaction(async (tx) => {
    const keeper = await tx.student.findUnique({
      where: { id: keepId },
      select: {
        id: true,
        lastName: true,
        nickname: true,
        grade: true,
        birthDate: true,
        profilePhotoUrl: true,
        schoolId: true,
      },
    });
    if (!keeper) throw new Error("The student you chose to keep no longer exists.");

    const keeperLinks = await tx.campaignStudent.findMany({
      where: { studentId: keepId },
      select: { campaignId: true },
    });
    const keeperCampaignIds = new Set(keeperLinks.map((link) => link.campaignId));

    const touchedCampaignIds = new Set<string>();
    const kept: string[] = [];
    const filled: Prisma.StudentUpdateInput = {};

    for (const mergeId of mergeIds) {
      const duplicate = await tx.student.findUnique({
        where: { id: mergeId },
        select: {
          id: true,
          lastName: true,
          nickname: true,
          grade: true,
          birthDate: true,
          profilePhotoUrl: true,
          schoolId: true,
        },
      });
      if (!duplicate) continue;

      // Move campaign links first, so the merge is useful even when the
      // duplicate itself has to stay.
      const links = await tx.campaignStudent.findMany({
        where: { studentId: mergeId },
        select: { id: true, campaignId: true, individualGoal: true, sortOrder: true },
      });
      for (const link of links) {
        touchedCampaignIds.add(link.campaignId);
        if (keeperCampaignIds.has(link.campaignId)) {
          await tx.campaignStudent.delete({ where: { id: link.id } });
        } else {
          await tx.campaignStudent.update({ where: { id: link.id }, data: { studentId: keepId } });
          keeperCampaignIds.add(link.campaignId);
        }
      }

      // Carry over anything the keeper is missing.
      if (!keeper.lastName && duplicate.lastName) filled.lastName = duplicate.lastName;
      if (!keeper.nickname && duplicate.nickname) filled.nickname = duplicate.nickname;
      if (!keeper.grade && duplicate.grade) filled.grade = duplicate.grade;
      if (!keeper.birthDate && duplicate.birthDate) filled.birthDate = duplicate.birthDate;
      if (!keeper.profilePhotoUrl && duplicate.profilePhotoUrl) {
        filled.profilePhotoUrl = duplicate.profilePhotoUrl;
      }
      if (!keeper.schoolId && duplicate.schoolId) {
        filled.school = { connect: { id: duplicate.schoolId } };
      }

      const block = await findStudentDeleteBlock(tx, mergeId);
      if (block) {
        kept.push(mergeId);
        continue;
      }
      await tx.student.delete({ where: { id: mergeId } });
    }

    if (Object.keys(filled).length > 0) {
      await tx.student.update({ where: { id: keepId }, data: filled });
    }

    return { touchedCampaignIds: [...touchedCampaignIds], kept };
  });

  for (const campaignId of outcome.touchedCampaignIds) {
    await recomputeCampaignCompletion(campaignId).catch(() => null);
  }

  const students = await listFamilyStudents(actor.id);
  return NextResponse.json({
    ok: true,
    keptBecauseProtected: outcome.kept,
    students: students.map(serializeFamilyStudent),
  });
}
