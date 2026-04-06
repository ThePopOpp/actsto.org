import { AdminUsersManager } from "@/components/dashboard/admin/admin-users-manager";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminUsersPage() {
  return (
    <>
      <AdminPageHeader
        title="Users"
        description="Parents, students, individual donors, business accounts — create, edit, and delete in this browser (localStorage preview); wire to your user service for production."
      />
      <AdminUsersManager />
      <Card className="mt-6 border-border/80">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Segments: FluentCRM tags (parent, student, donor_individual, donor_business). Actions:
          reset password, lock account, merge duplicates — wire to your user service.
        </CardContent>
      </Card>
    </>
  );
}
