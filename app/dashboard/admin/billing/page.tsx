import { AdminPaypalSettingsForm } from "@/components/dashboard/admin/admin-paypal-settings-form";
import { AdminPaypalActivityPanel } from "@/components/dashboard/admin/admin-paypal-activity-panel";
import { AdminPageTabLinks, type AdminPageTabLink } from "@/components/dashboard/admin/admin-page-tab-links";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";

type PaymentsTab = "payments" | "receipts" | "webhooks" | "credentials";

const tabs: AdminPageTabLink<PaymentsTab>[] = [
  { id: "payments", label: "Payments" },
  { id: "receipts", label: "Receipts" },
  { id: "webhooks", label: "Webhooks" },
  { id: "credentials", label: "Credentials" },
];

function parseTab(value: unknown): PaymentsTab {
  return tabs.some((tab) => tab.id === value) ? (value as PaymentsTab) : "payments";
}

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const activeTab = parseTab(params.tab);

  return (
    <>
      <AdminPageHeader
        title="Payments"
        description="Donation capture, settlement reports, fee summaries, and reconciliation exports."
      />
      <div className="space-y-6">
        <AdminPageTabLinks tabs={tabs} activeTab={activeTab} baseHref="/dashboard/admin/billing" />
        {activeTab === "payments" ? <AdminPaypalActivityPanel view="payments" /> : null}
        {activeTab === "receipts" ? <AdminPaypalActivityPanel view="receipts" /> : null}
        {activeTab === "webhooks" ? (
          <>
            <AdminPaypalActivityPanel view="webhooks" />
            <Card className="mt-6 border-border/80">
              <CardContent className="p-6 text-sm text-muted-foreground">
                PayPal webhook endpoint: <span className="font-mono">/api/webhooks/paypal</span>.
                Configure the full deployed URL in PayPal Developer Dashboard, then trigger a checkout
                or use PayPal&apos;s webhook simulator. Successful delivery appears in Webhook and
                payment events.
              </CardContent>
            </Card>
          </>
        ) : null}
        {activeTab === "credentials" ? <AdminPaypalSettingsForm /> : null}
      </div>
    </>
  );
}
