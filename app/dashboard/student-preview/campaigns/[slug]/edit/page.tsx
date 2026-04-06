import { notFound } from "next/navigation";

import { CampaignEditorForm } from "@/components/dashboard/campaign-editor-form";
import { getCampaignBySlug } from "@/lib/campaigns";
import { campaignToFormValues } from "@/lib/dashboard/campaign-editor";

export default async function StudentPreviewCampaignEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCampaignBySlug(decodeURIComponent(slug));
  if (!c) notFound();
  return <CampaignEditorForm basePath="/dashboard/student-preview" initial={campaignToFormValues(c)} />;
}
