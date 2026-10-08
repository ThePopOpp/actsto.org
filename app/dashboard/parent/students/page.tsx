import { redirect } from "next/navigation";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { ParentStudentsManager } from "@/components/dashboard/parent/parent-students-manager";
import {
  StudentScholarshipPanel,
  type StudentScholarshipInfo,
} from "@/components/dashboard/parent/student-scholarship-panel";
import { studentAwardSummaries } from "@/lib/allocation/server";
import { getActSession } from "@/lib/auth/session-server";
import { getManagedCampaignRefs, getProfileForEmail } from "@/lib/dashboard/parent-scope";
import { getEligibilitySettings } from "@/lib/eligibility/settings-server";
import { prisma } from "@/lib/prisma";
import {
  findDuplicateGroups,
  listFamilyStudents,
  serializeFamilyStudent,
} from "@/lib/students/parent-students";

export const dynamic = "force-dynamic";

export default async function ParentStudentsPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/parent/students");

  const profile = await getProfileForEmail(session.email);
  const [students, campaigns] = profile
    ? await Promise.all([listFamilyStudents(profile.id), getManagedCampaignRefs(profile.id)])
    : [[], []];

  // Only this parent's own children: listFamilyStudents is already scoped.
  const ids = students.map((s) => s.id);
  const [flags, verifications, settings] = await Promise.all([
    ids.length
      ? prisma.studentEligibilityFlag.findMany({
          where: { studentId: { in: ids } },
          select: { studentId: true, flag: true, schoolYear: true, status: true, reason: true },
          orderBy: { schoolYear: "desc" },
        })
      : [],
    ids.length
      ? prisma.studentVerification.findMany({
          where: { studentId: { in: ids } },
          orderBy: { createdAt: "desc" },
          select: { id: true, studentId: true, kind: true, status: true, schoolYear: true, parentMessage: true },
        })
      : [],
    getEligibilitySettings(),
  ]);
  const scholarship: StudentScholarshipInfo[] = await Promise.all(
    students.map(async (s) => ({
      id: s.id,
      name: [s.firstName, s.lastName].filter(Boolean).join(" "),
      grade: s.grade,
      flags: flags.filter((f) => f.studentId === s.id),
      verifications: verifications
        .filter((v) => v.studentId === s.id)
        .map((v) => ({ ...v, kind: v.kind === "displacement" ? ("displacement" as const) : ("disability" as const) })),
      awards: await studentAwardSummaries(s.id),
    })),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <DashboardSectionPlaceholder
          title="Students"
          description="Every student on your account lives here. Add a child once, then connect them to any campaign — one student can appear on more than one campaign, and one campaign can support more than one student."
        />
        <ParentStudentsManager
          students={students.map(serializeFamilyStudent)}
          campaigns={campaigns}
          duplicateGroups={findDuplicateGroups(students)}
        />
      </div>
      <StudentScholarshipPanel students={scholarship} displacedDefinition={settings.displacedDefinition} />
    </div>
  );
}
