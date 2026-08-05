import { AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { HouseholdIncomeLedger } from "@/components/dashboard/scholarship/household-income-ledger";
import { IncomeReportingGuide } from "@/components/dashboard/scholarship/income-reporting-guide";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { prisma } from "@/lib/prisma";
import { COPY } from "@/lib/scholarship/constants";
import { householdLastUpdated, listHouseholdMembers } from "@/lib/scholarship/household";
import { getParentActor, parentApplicationWhere } from "@/lib/scholarship/scope";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Update household income",
};

/**
 * The standalone income editor.
 *
 * Reachable regardless of application state — household income belongs to the
 * parent, not to an application — but it says so plainly when there's nothing
 * on file, because a parent who lands here first will otherwise assume they've
 * applied.
 */
export default async function HouseholdIncomePage() {
  const parent = await getParentActor();
  if (!parent) {
    redirect("/login?role=parent&next=/dashboard/parent/household-income");
  }

  const [members, lastUpdated, liveApplication] = await Promise.all([
    listHouseholdMembers(parent.profileId),
    householdLastUpdated(parent.profileId),
    prisma.scholarshipApplication.findFirst({
      where: {
        ...parentApplicationWhere(parent.profileId),
        status: { notIn: ["denied", "withdrawn"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, schoolYear: true, status: true, lockedAt: true },
    }),
  ]);

  const hasSubmitted = Boolean(liveApplication?.lockedAt);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Financial details
        </p>
        <h1 className="font-heading text-2xl font-semibold text-primary">
          Update household income
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{COPY.incomePageIntro}</p>
      </header>

      {!liveApplication ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            <strong className="text-foreground">Before you edit.</strong>{" "}
            {COPY.incomePageNoApplication.replace(
              "choose Apply for a scholarship instead",
              "start one instead",
            )}{" "}
            <Link
              href="/dashboard/parent/apply"
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
            >
              Apply for a scholarship
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">How to fill this out</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="font-medium text-foreground">{COPY.financialRequired}</p>
          <p className="text-muted-foreground">{COPY.householdDefinitionShort}</p>

          <Alert>
            <Info className="size-4" />
            <AlertDescription>{COPY.householdIncludeEveryone}</AlertDescription>
          </Alert>

          {hasSubmitted ? (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>{COPY.incomeAfterSubmission}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <HouseholdIncomeLedger
        initialMembers={members}
        initialLastUpdated={lastUpdated?.toISOString() ?? null}
      />

      <IncomeReportingGuide />
    </div>
  );
}
