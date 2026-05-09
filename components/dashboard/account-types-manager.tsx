"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CircleDashed, Plus, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { dashboardPathForRole } from "@/lib/auth/paths";
import type { PortalRole } from "@/lib/auth/types";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

type AccountTypeSummary = {
  role: PortalRole;
  label: string;
  status: "active" | "available";
  isActive: boolean;
  isComplete: boolean;
  completionPercent: number;
  requiredFields: string[];
  completedFields: string[];
  missingFields: string[];
  dashboardHref: string;
};

const ROLE_DESCRIPTIONS: Record<PortalRole, string> = {
  parent: "Create student campaigns, manage students, track campaign progress, and respond to donor activity.",
  student: "View student campaign progress, scholarship status, messages, and student-facing profile details.",
  donor_individual: "Make personal donations, manage tax receipts, save campaigns, and track giving history.",
  donor_business: "Manage business giving, corporate tax-credit records, receipts, pledges, and compliance details.",
};

function setupHref(role: PortalRole) {
  const base = dashboardPathForRole(role);
  if (role === "donor_business") return `${base}/company`;
  return `${base}/profile`;
}

function statusBadge(account: AccountTypeSummary) {
  if (!account.isActive) return <Badge variant="outline">Not added</Badge>;
  if (account.isComplete) return <Badge className="bg-emerald-600 hover:bg-emerald-600">Complete</Badge>;
  return <Badge variant="secondary">Setup needed</Badge>;
}

export function AccountTypesManager({ activeRole }: { activeRole: PortalRole }) {
  const [accounts, setAccounts] = useState<AccountTypeSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<PortalRole | null>(null);
  const activeCount = useMemo(() => accounts?.filter((account) => account.isActive).length ?? 0, [accounts]);

  async function loadAccountTypes() {
    setLoadError(null);
    try {
      const res = await fetch("/api/auth/account-types");
      const data = (await res.json().catch(() => null)) as {
        accountTypes?: AccountTypeSummary[];
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not load account types.");
      setAccounts(Array.isArray(data?.accountTypes) ? data.accountTypes : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load account types.");
      setAccounts([]);
    }
  }

  useEffect(() => {
    void loadAccountTypes();
  }, []);

  async function addRole(role: PortalRole) {
    setPendingRole(role);
    setLoadError(null);
    try {
      const res = await fetch("/api/auth/account-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json().catch(() => null)) as { redirect?: string; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not add account type.");
      window.location.href = data?.redirect ?? dashboardPathForRole(role);
    } catch (error) {
      setPendingRole(null);
      setLoadError(error instanceof Error ? error.message : "Could not add account type.");
    }
  }

  if (!accounts) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading account types...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-primary">
            <UserCog className="size-5" />
            One login, multiple account types
          </CardTitle>
          <CardDescription>
            Add the roles you need, switch dashboards from the sidebar, and finish each profile before using live account-specific features.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{activeCount} active account type{activeCount === 1 ? "" : "s"}</Badge>
          <Badge variant="outline">Current: {accounts.find((account) => account.role === activeRole)?.label ?? "Dashboard"}</Badge>
        </CardContent>
      </Card>

      {loadError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {accounts.map((account) => {
          const isCurrent = account.role === activeRole;
          return (
            <Card key={account.role} className="border-border/80">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-heading text-xl text-primary">{account.label}</CardTitle>
                    <CardDescription className="mt-1 max-w-xl">
                      {ROLE_DESCRIPTIONS[account.role]}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isCurrent ? <Badge>Current</Badge> : null}
                    {statusBadge(account)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">Profile completion</span>
                    <span className="tabular-nums text-muted-foreground">{account.completionPercent}%</span>
                  </div>
                  <Progress value={account.completionPercent} />
                </div>

                {account.isActive ? (
                  <div className="space-y-2 text-sm">
                    {account.isComplete ? (
                      <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="size-4" />
                        This account type has the required profile basics.
                      </p>
                    ) : (
                      <>
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="size-4 text-amber-600" />
                          Finish these fields before using every live feature:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {account.missingFields.map((field) => (
                            <Badge key={field} variant="outline">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CircleDashed className="size-4" />
                    Add this account type when this user needs access to this dashboard.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {account.isActive ? (
                    <>
                      <Link
                        href={account.dashboardHref}
                        className={cn(buttonVariants({ variant: isCurrent ? "secondary" : "default" }))}
                      >
                        Open dashboard
                      </Link>
                      <Link
                        href={setupHref(account.role)}
                        className={cn(buttonVariants({ variant: "outline" }))}
                      >
                        {account.isComplete ? "Review profile" : "Continue setup"}
                      </Link>
                    </>
                  ) : (
                    <Button type="button" onClick={() => void addRole(account.role)} disabled={pendingRole !== null}>
                      <Plus className="mr-2 size-4" />
                      {pendingRole === account.role ? "Adding..." : `Add ${account.label}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
