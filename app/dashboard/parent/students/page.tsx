import { redirect } from "next/navigation";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { ParentStudentsManager } from "@/components/dashboard/parent/parent-students-manager";
import { getActSession } from "@/lib/auth/session-server";
import { getManagedCampaignRefs, getProfileForEmail } from "@/lib/dashboard/parent-scope";
import {
  findDuplicateGroups,
  listFamilyStudents,
  serializeFamilyStudent,
} from "@/lib/students/parent-students";

export default async function ParentStudentsPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/parent/students");

  const profile = await getProfileForEmail(session.email);
  const [students, campaigns] = profile
    ? await Promise.all([listFamilyStudents(profile.id), getManagedCampaignRefs(profile.id)])
    : [[], []];

  return (
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
  );
}
