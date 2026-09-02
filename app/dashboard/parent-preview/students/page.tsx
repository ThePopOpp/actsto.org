import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import {
  ParentStudentsManager,
  type ParentStudentRow,
} from "@/components/dashboard/parent/parent-students-manager";
import { getDemoFamilyCampaigns } from "@/lib/dashboard/demo-family-campaigns";

/**
 * Design-review preview of the parent Students page.
 *
 * It renders the real manager against the same demo campaigns the rest of the
 * parent preview uses, rather than a hand-written copy of the card markup. The
 * previous version hardcoded two students and its own layout, so it drifted
 * out of date the moment the real page changed.
 */
export default async function ParentPreviewStudentsPage() {
  const campaigns = await getDemoFamilyCampaigns();

  const byStudent = new Map<string, ParentStudentRow>();
  for (const campaign of campaigns) {
    for (const student of campaign.students) {
      const name = [student.firstName, student.lastName].filter(Boolean).join(" ");
      const key = student.id ?? name.toLowerCase();
      const existing = byStudent.get(key);
      const link = {
        id: campaign.slug,
        slug: campaign.slug,
        title: campaign.title,
        status: campaign.status ?? "active",
        individualGoal: student.individualGoal,
        endsAt: campaign.endDate ? new Date(`${campaign.endDate}T00:00:00`).toISOString() : null,
      };

      if (existing) {
        existing.campaigns.push(link);
        continue;
      }

      byStudent.set(key, {
        id: student.id ?? key,
        firstName: student.firstName,
        lastName: student.lastName,
        nickname: student.nickname ?? "",
        name,
        grade: student.gradeDisplay === "-" ? "" : student.gradeDisplay,
        birthDate: null,
        ageVerified: false,
        photo: student.photo ?? "",
        schoolId: null,
        school: student.school,
        studentUserId: null,
        studentInviteEmail: null,
        studentInviteExpiresAt: null,
        campaigns: [link],
      });
    }
  }

  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Students"
        description="Every student on your account lives here. Add a child once, then connect them to any campaign — one student can appear on more than one campaign, and one campaign can support more than one student."
      />
      <ParentStudentsManager
        students={[...byStudent.values()]}
        campaigns={campaigns.map((campaign) => ({
          id: campaign.slug,
          slug: campaign.slug,
          title: campaign.title,
        }))}
      />
    </div>
  );
}
