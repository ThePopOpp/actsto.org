import { AlertTriangle } from "lucide-react";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { ApplicationWindowsEditor } from "@/components/dashboard/admin/application-windows-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/scholarship/capabilities";
import { getStaffActor } from "@/lib/scholarship/scope";

export const dynamic = "force-dynamic";

export default async function ApplicationWindowsPage() {
  const actor = await getStaffActor();
  if (!actor || !can(actor.staffRole, "windows.manage")) {
    return (
      <>
        <AdminPageHeader title="Application windows" />
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Your account can&apos;t change application windows.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const windows = await prisma.applicationWindow.findMany({
    orderBy: { opensAt: "desc" },
  });

  return (
    <>
      <AdminPageHeader
        title="Application windows"
        description="When each school year accepts applications. Moving these dates takes effect immediately — no deploy needed."
      />
      <ApplicationWindowsEditor
        windows={windows.map((w) => ({
          id: w.id,
          schoolYear: w.schoolYear,
          opensAt: w.opensAt.toISOString(),
          closesAt: w.closesAt.toISOString(),
          lateGraceUntil: w.lateGraceUntil?.toISOString() ?? null,
          isPublished: w.isPublished,
        }))}
      />
    </>
  );
}
