import { AdminTwilioSettingsForm } from "@/components/dashboard/admin/admin-twilio-settings-form";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminSmsPage() {
  return (
    <>
      <AdminPageHeader
        title="SMS · Twilio"
        description="A2P registration, messaging service SID, inbound numbers, opt-out handling, and delivery logs."
      />
      <AdminTwilioSettingsForm />
      <Card className="mt-6 border-border/80">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Template variables: donor name, campaign link, short code compliance for Arizona
          disclosures. Delivery dashboards plug in after Twilio sync.
        </CardContent>
      </Card>
    </>
  );
}
