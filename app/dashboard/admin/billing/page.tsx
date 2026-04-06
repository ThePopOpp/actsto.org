import { AdminPaypalSettingsForm } from "@/components/dashboard/admin/admin-paypal-settings-form";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminBillingPage() {
  return (
    <>
      <AdminPageHeader
        title="Billing · PayPal"
        description="Donation capture, settlement reports, fee summaries, and reconciliation exports."
      />
      <AdminPaypalSettingsForm />
      <Card className="mt-6 border-border/80">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Webhook listener status, last sync, and disputes will appear here after you connect PayPal
          webhooks to the API.
        </CardContent>
      </Card>
    </>
  );
}
