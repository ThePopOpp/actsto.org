import { NextResponse } from "next/server";

import { getSiteCampaigns } from "@/lib/campaigns-source";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const campaigns = await getSiteCampaigns();
  const slugs = campaigns.map((campaign) => campaign.slug);

  const normalizedCampaigns = await prisma.campaign
    .findMany({
      where: { slug: { in: slugs }, status: { in: ["active", "pending_review"] } },
      select: {
        id: true,
        slug: true,
        title: true,
        schoolId: true,
        school: { select: { name: true } },
        campaignStudents: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: {
            studentId: true,
            student: {
              select: {
                firstName: true,
                lastName: true,
                grade: true,
                schoolId: true,
                school: { select: { name: true } },
              },
            },
          },
        },
      },
    })
    .catch(() => []);

  const bySlug = new Map(normalizedCampaigns.map((campaign) => [campaign.slug, campaign]));

  return NextResponse.json({
    campaigns: campaigns.map((campaign) => {
      const normalized = bySlug.get(campaign.slug);
      const studentLink = normalized?.campaignStudents[0];
      const student = studentLink?.student;
      const fallbackStudent = campaign.students[0];

      return {
        slug: campaign.slug,
        title: normalized?.title ?? campaign.title,
        campaignId: normalized?.id ?? null,
        studentId: studentLink?.studentId ?? null,
        schoolId: student?.schoolId ?? normalized?.schoolId ?? null,
        studentFirstName: student?.firstName ?? fallbackStudent?.firstName ?? "",
        studentLastName: student?.lastName ?? fallbackStudent?.lastName ?? "",
        grade: student?.grade ?? normalizeGrade(fallbackStudent?.gradeDisplay),
        schoolName: student?.school?.name ?? normalized?.school?.name ?? fallbackStudent?.school ?? campaign.school.name,
      };
    }),
  });
}

function normalizeGrade(value: string | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/kindergarten/i.test(trimmed)) return "K";
  const match = /^\d+/.exec(trimmed);
  return match?.[0] ?? trimmed;
}
