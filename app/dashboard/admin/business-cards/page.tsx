import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { BusinessCardsClient } from "@/components/dashboard/business-cards/business-cards-client";
import { getActSession } from "@/lib/auth/session-server";

export default async function AdminBusinessCardsPage() {
  const session = await getActSession();
  return (
    <>
      <AdminPageHeader
        title="Business Cards"
        description="Digital business cards with a public QR/NFC profile, lead capture, and analytics."
      />
      <BusinessCardsClient
        owner={{ displayName: session?.name ?? "", email: session?.email ?? "" }}
        isAdmin={session?.role === "super_admin"}
      />
    </>
  );
}
