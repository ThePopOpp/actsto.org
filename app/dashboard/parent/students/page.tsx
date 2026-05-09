import Link from "next/link";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import {
  ParentStudentsManager,
  type ParentStudentRow,
} from "@/components/dashboard/parent/parent-students-manager";
import { buttonVariants } from "@/lib/button-variants";
import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

async function getParentStudents(): Promise<ParentStudentRow[]> {
  const session = await getActSession();
  if (!session?.email) return [];

  const profile = await prisma.profile.findFirst({
    where: { email: session.email.toLowerCase() },
    select: { id: true },
  });
  if (!profile) return [];

  const students = await prisma.student.findMany({
    where: { parentUserId: profile.id },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      grade: true,
      birthDate: true,
      ageVerified: true,
      studentUserId: true,
      studentInviteEmail: true,
      studentInviteExpiresAt: true,
      school: { select: { name: true } },
      campaignStudents: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { campaign: { select: { slug: true } } },
      },
    },
  });

  return students.map((student) => ({
    id: student.id,
    name: [student.firstName, student.lastName].filter(Boolean).join(" "),
    grade: student.grade,
    school: student.school?.name ?? null,
    campaignSlug: student.campaignStudents[0]?.campaign.slug ?? null,
    birthDate: student.birthDate ? student.birthDate.toISOString().slice(0, 10) : null,
    ageVerified: student.ageVerified,
    studentUserId: student.studentUserId,
    studentInviteEmail: student.studentInviteEmail,
    studentInviteExpiresAt: student.studentInviteExpiresAt
      ? student.studentInviteExpiresAt.toISOString()
      : null,
  }));
}

export default async function ParentStudentsPage() {
  const students = await getParentStudents();

  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Students"
        description="Students linked to your account appear here. Parent-created student records stay primary; students 16+ can be invited to connect an independent login."
      />
      <div className="flex justify-end">
        <Link href="/campaigns/new" className={cn(buttonVariants({ size: "sm" }))}>
          Add student
        </Link>
      </div>
      <ParentStudentsManager students={students} />
    </div>
  );
}
