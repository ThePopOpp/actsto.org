import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateCampaignWizard } from "@/components/campaigns/create-campaign-wizard";
import { getActSession } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Create campaign",
};

export default async function NewCampaignPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/campaigns/new");

  const profile = await prisma.profile
    .findFirst({
      where: { email: session.email.toLowerCase() },
      select: {
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

  return (
    <div className="bg-background">
      <CreateCampaignWizard
        initialValues={{
          parentName,
          parentEmail: profile?.email ?? session.email,
          parentPhone: profile?.phone ?? "",
          parentPhoto: profile?.avatarUrl ?? "",
        }}
      />
    </div>
  );
}
