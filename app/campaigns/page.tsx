import type { Metadata } from "next";
import { Suspense } from "react";

import { CampaignsPageClient } from "./campaigns-client";

export const metadata: Metadata = {
  title: "Campaigns",
};

export default function CampaignsPage() {
  return (
    <div className="bg-background">
      <Suspense fallback={<div className="min-h-[50vh] bg-background" aria-hidden />}>
        <CampaignsPageClient />
      </Suspense>
    </div>
  );
}
