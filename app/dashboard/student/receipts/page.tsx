import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Tax receipts belong to whoever gave, and scholarship records to the parent
 * who applied, so a student account has no documents of its own. This page
 * used to offer a "(sample)" PDF behind a "Download (demo)" button.
 */
export default function StudentReceiptsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Receipts & tax"
        description="Tax receipts and scholarship records for your family."
      />
      <Card className="border-dashed border-border">
        <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
          <p>
            Donors receive a tax receipt for each gift in their own account, so there are none to download here.
          </p>
          <p>
            Your scholarship records, including what has been awarded and sent to your school, are in your parent or
            guardian&apos;s account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
