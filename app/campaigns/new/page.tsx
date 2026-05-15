import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateCampaignWizard } from "@/components/campaigns/create-campaign-wizard";
import { getActSession } from "@/lib/auth/session-server";

export const metadata: Metadata = {
  title: "Create campaign",
};

export default async function NewCampaignPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/campaigns/new");

  return (
    <div className="bg-background">
      <CreateCampaignWizard />
    </div>
  );
}
