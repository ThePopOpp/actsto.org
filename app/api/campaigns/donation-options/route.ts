import { NextResponse } from "next/server";

import { getSiteCampaigns } from "@/lib/campaigns-source";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export type DonationOptionStudent = {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  schoolName: string;
};

export type DonationOptionCampaign = {
  slug: string;
  title: string;
  campaignId: string | null;
  isSchoolLevel: boolean;
  schoolId: string | null;
  schoolName: string;
  /** Every student linked to the campaign, in display order. */
  students: DonationOptionStudent[];
};

export type DonationOptionSchool = { id: string; name: string };

/**
 * GET /api/campaigns/donation-options
 *
 * Live campaigns with all of their students (the donation form preselects
 * every one), and the participating schools a corporate donor can recommend,
 * with Valley Christian Schools as the default. Student names here are the
 * ones already shown on each public campaign page.
 */
export async function GET() {
  const campaigns = await getSiteCampaigns();
  const slugs = campaigns.map((campaign) => campaign.slug);

  const [rows, schools] = await Promise.all([
    prisma.campaign
      .findMany({
        where: { slug: { in: slugs }, status: { in: ["active", "pending_review"] } },
        select: {
          id: true,
          slug: true,
          title: true,
          isSchoolLevel: true,
          schoolId: true,
          school: { select: { name: true } },
          campaignStudents: {
            orderBy: { sortOrder: "asc" },
            select: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  grade: true,
                  status: true,
                  schoolId: true,
                  school: { select: { name: true } },
                },
              },
            },
          },
        },
      })
      .catch(() => []),
    prisma.school
      .findMany({
        where: { status: "active" },
        orderBy: [{ isPartner: "desc" }, { name: "asc" }],
        select: { id: true, name: true },
      })
      .catch(() => []),
  ]);

  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const defaultSchool =
    schools.find((s) => /^valley christian/i.test(s.name)) ?? null;

  const options: DonationOptionCampaign[] = campaigns.map((campaign) => {
    const row = bySlug.get(campaign.slug);
    const students = (row?.campaignStudents ?? [])
      .map((cs) => cs.student)
      .filter((s) => s.status !== "archived")
      .map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName ?? "",
        grade: s.grade ?? "",
        schoolName: s.school?.name ?? row?.school?.name ?? "",
      }));
    const firstSchoolId = row?.campaignStudents[0]?.student.schoolId ?? null;
    return {
      slug: campaign.slug,
      title: row?.title ?? campaign.title,
      campaignId: row?.id ?? null,
      isSchoolLevel: row?.isSchoolLevel ?? false,
      schoolId: row?.schoolId ?? firstSchoolId,
      schoolName: row?.school?.name ?? students[0]?.schoolName ?? campaign.school.name,
      students: row?.isSchoolLevel ? [] : students,
    };
  });

  return NextResponse.json({
    campaigns: options,
    schools: schools satisfies DonationOptionSchool[],
    defaultSchoolId: defaultSchool?.id ?? null,
  });
}
