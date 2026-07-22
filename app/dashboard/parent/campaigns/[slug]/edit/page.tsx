import { notFound, redirect } from "next/navigation";

import { CampaignEditorForm } from "@/components/dashboard/campaign-editor-form";
import { getActSession } from "@/lib/auth/session-server";
import { getEditableCampaignBySlugForSession, getSiteCampaignBySlug } from "@/lib/campaigns-source";
import { campaignToFormValues } from "@/lib/dashboard/campaign-editor";

export default async function ParentCampaignEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getActSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const c =
    (await getEditableCampaignBySlugForSession(decodedSlug, session)) ??
    (await getSiteCampaignBySlug(decodedSlug));
  if (!c) notFound();
  return <CampaignEditorForm basePath="/dashboard/parent" initial={campaignToFormValues(c)} initialStatus={c.status} />;
}
