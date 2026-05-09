import { AdminCampaignsManager } from "@/components/dashboard/admin/admin-campaigns-manager";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminCampaignsPage() {
  return (
    <>
      <AdminPageHeader
        title="Campaign management"
        description="Create, update, and delete campaigns with the full editor. Saved campaign content now feeds the public campaign pages, cards, and role dashboards."
      />
      <AdminCampaignsManager />
      <Card className="mt-6 border-border/80">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Next: table filters (All · Pending · Approved · Rejected · Featured), CSV export, reviewers, and FluentCRM
          sync.
        </CardContent>
      </Card>
    </>
  );
}
