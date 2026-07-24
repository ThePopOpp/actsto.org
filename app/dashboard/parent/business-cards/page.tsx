import { BusinessCardsClient } from "@/components/dashboard/business-cards/business-cards-client";
import { getActSession } from "@/lib/auth/session-server";

/** Canonical portal Business Cards page — re-exported by every portal + preview route. */
export default async function PortalBusinessCardsPage() {
  const session = await getActSession();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Business Cards</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Create a digital business card with a public QR/NFC profile, lead capture, and analytics — link it to your
          campaigns and share it anywhere.
        </p>
      </div>
      <BusinessCardsClient
        owner={{ displayName: session?.name ?? "", email: session?.email ?? "" }}
        isAdmin={false}
      />
    </div>
  );
}
