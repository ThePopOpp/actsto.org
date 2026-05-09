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
      <Card className="mt-6 border-border/80">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Creates Supabase Auth users, app profiles, role records, and role-specific profile scaffolds.
          Password reset emails and duplicate merge tools can plug in next.
        </CardContent>
      </Card>
    </>
  );
}
