import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateCampaignWizard } from "@/components/campaigns/create-campaign-wizard";
import { getActSession } from "@/lib/auth/session-server";
import { splitParentName } from "@/lib/dashboard/campaign-editor";
import { canCreateSchoolLevelCampaign } from "@/lib/schools/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Create campaign",
};

export default async function NewCampaignPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/campaigns/new");

  const profile = await prisma.profile
    .findFirst({
      where: { email: { equals: session.email, mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatarUrl: true,
        phone: true,
      },
    })
    .catch(() => null);
  const parentName =
    profile?.displayName ??
    profile?.fullName ??
    ([profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || session.name);

  // First and last from the account when stored; otherwise a split of the
  // display name as a starting point the parent can correct.
  const fallback = splitParentName(parentName ?? "");
  const canCreateSchoolLevel = profile ? await canCreateSchoolLevelCampaign(session, profile.id, null) : false;

  return (
    <div className="bg-background">
      <CreateCampaignWizard
        canCreateSchoolLevel={canCreateSchoolLevel}
        initialValues={{
          parentName,
          parentFirstName: profile?.firstName ?? fallback.first,
          parentLastName: profile?.lastName ?? fallback.last,
          parentEmail: profile?.email ?? session.email,
          parentPhone: profile?.phone ?? "",
          parentPhoto: profile?.avatarUrl ?? "",
        }}
      />
    </div>
  );
}
