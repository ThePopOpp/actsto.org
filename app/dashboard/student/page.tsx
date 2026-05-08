import { StudentDashboardContent } from "@/components/dashboard/student-dashboard-content";
import { getLiveDemoStudentCampaigns } from "@/lib/dashboard/demo-family-campaigns";

export default async function StudentDashboardPage() {
  const [campaign] = await getLiveDemoStudentCampaigns();
  return <StudentDashboardContent campaign={campaign} />;
}
