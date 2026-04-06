import type { Metadata } from "next";

import { CreateCampaignWizard } from "@/components/campaigns/create-campaign-wizard";

export const metadata: Metadata = {
  title: "Create campaign",
};

export default function NewCampaignPage() {
  return (
    <div className="bg-background">
      <CreateCampaignWizard />
    </div>
  );
}
