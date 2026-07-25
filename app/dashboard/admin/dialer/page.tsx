import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { DialerPanel } from "@/components/dashboard/admin/sms/dialer-panel";

export const dynamic = "force-dynamic";

export default function AdminDialerPage() {
  return (
    <>
      <AdminPageHeader title="Dialer" description="Place and receive calls in the browser, with call history, recordings, and voicemail — powered by Twilio Voice." />
      <DialerPanel />
    </>
  );
}
