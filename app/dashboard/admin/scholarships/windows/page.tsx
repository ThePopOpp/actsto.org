import { AlertTriangle } from "lucide-react";

import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { ApplicationWindowsEditor } from "@/components/dashboard/admin/application-windows-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/scholarship/capabilities";
import { getStaffActor } from "@/lib/scholarship/scope";
import { resolveWindowState } from "@/lib/scholarship/windows";

export const dynamic = "force-dynamic";

export default async function ApplicationWindowsPage() {
  const actor = await getStaffActor();
  // Opening and closing applications is a Super Admin decision, so this is
  // narrower than the general windows.manage capability. The API enforces the
  // same rule — this only decides what gets rendered.
  if (!actor || !can(actor.staffRole, "windows.manage") || !actor.isSuperAdmin) {
    return (
      <>
        <AdminPageHeader title="Application windows" />
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Only a Super Admin can open or close application windows.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const windows = await prisma.applicationWindow.findMany({
    orderBy: { opensAt: "desc" },
  });

  const overrideActorIds = [...new Set(windows.map((w) => w.overrideBy).filter(Boolean))] as string[];
  const overrideActors = overrideActorIds.length
    ? await prisma.profile.findMany({
        where: { id: { in: overrideActorIds } },
        select: { id: true, displayName: true, fullName: true, email: true },
      })
    : [];

  return (
    <>
      <AdminPageHeader
        title="Application windows"
        description="When each school year accepts applications. Set the dates, or use the switch to open and close applications by hand. Changes take effect immediately — no deploy needed."
      />
      <ApplicationWindowsEditor
        windows={windows.map((w) => {
          const state = resolveWindowState(w);
          const who = overrideActors.find((p) => p.id === w.overrideBy);
          return {
            id: w.id,
            schoolYear: w.schoolYear,
            opensAt: w.opensAt.toISOString(),
            closesAt: w.closesAt.toISOString(),
            lateGraceUntil: w.lateGraceUntil?.toISOString() ?? null,
            isPublished: w.isPublished,
            manualOverride: w.manualOverride,
            overrideNote: w.overrideNote,
            overrideAt: w.overrideAt?.toISOString() ?? null,
            overrideByName: who?.displayName ?? who?.fullName ?? who?.email ?? null,
            // Resolved server-side so the badge can't disagree with what
            // parents are actually seeing.
            liveStatus: {
              acceptingNew: state.canStart,
              acceptingSubmissions: state.canSubmit,
              phase: state.phase,
              reason: state.reason,
            },
          };
        })}
      />
    </>
  );
}
