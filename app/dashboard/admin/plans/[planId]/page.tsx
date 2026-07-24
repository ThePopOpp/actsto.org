import { PlanWorkspace } from "@/components/plans/plan-workspace";

export const dynamic = "force-dynamic";

export default async function AdminPlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  return <PlanWorkspace planId={planId} />;
}
