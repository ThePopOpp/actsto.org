import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { AdminUsersManager } from "@/components/dashboard/admin/admin-users-manager";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminUsersPage() {
  return (
    <>
      <AdminPageHeader
        title="Users"
        description="Parents, students, individual donors, business accounts, and Super Admins connected to Supabase Auth and app profiles."
      />
      <AdminUsersManager />
      <Link href="/dashboard/admin/consent" className="group mt-6 block">
        <Card className="border-border/80 transition-shadow group-hover:shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-medium text-primary">Consent &amp; communications <ArrowRight className="size-3.5" /></p>
              <p className="text-xs text-muted-foreground">Auditable email/SMS opt-in status per contact, the full consent audit trail, and staff-recorded actions.</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </>
  );
}
