import { AdminPaypalSettingsForm } from "@/components/dashboard/admin/admin-paypal-settings-form";
import { AdminPaypalActivityPanel } from "@/components/dashboard/admin/admin-paypal-activity-panel";
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
      <AdminPaypalActivityPanel />
      <Card className="mt-6 border-border/80">
        <CardContent className="p-6 text-sm text-muted-foreground">
          PayPal webhook endpoint: <span className="font-mono">/api/webhooks/paypal</span>.
          Configure the full deployed URL in PayPal Developer Dashboard, then trigger a sandbox
          checkout or use PayPal&apos;s webhook simulator. Successful delivery appears above in
          Webhook and payment events.
        </CardContent>
      </Card>
    </>
  );
}
