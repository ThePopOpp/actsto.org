import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { ApplicationWizard } from "@/components/dashboard/scholarship/application-wizard";
import { DeniedApplicationView } from "@/components/dashboard/scholarship/denied-application-view";
import { getParentActor, ScopeError } from "@/lib/scholarship/scope";
import { loadWizardData } from "@/lib/scholarship/wizard-data";

export const metadata = {
  title: "Your scholarship application",
};

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  const parent = await getParentActor();
  if (!parent) {
    redirect(`/login?role=parent&next=/dashboard/parent/apply/${applicationId}`);
  }

  let data;
  try {
    data = await loadWizardData(applicationId, parent);
  } catch (error) {
    // Ownership failures and missing rows are indistinguishable on purpose —
    // "not yours" must not read differently from "doesn't exist".
    if (error instanceof ScopeError && error.status === 404) notFound();
    throw error;
  }

  // A denied application is history. It opens read-only with the decision and
  // the path forward, never as an editable wizard.
  if (data.application.status === "denied" || data.application.status === "withdrawn") {
    return <DeniedApplicationView data={data} />;
  }

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading your application…</p>}>
      <ApplicationWizard data={data} />
    </Suspense>
  );
}
