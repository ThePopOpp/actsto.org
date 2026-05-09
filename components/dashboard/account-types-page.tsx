import { AccountTypesManager } from "@/components/dashboard/account-types-manager";
import type { PortalRole } from "@/lib/auth/types";

export function AccountTypesPage({ activeRole }: { activeRole: PortalRole }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wide text-act-red uppercase">Hybrid account</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-primary sm:text-3xl">
          Account Types
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Manage which dashboards this login can access and see what each account type still needs before it is fully active.
        </p>
      </div>
      <AccountTypesManager activeRole={activeRole} />
    </div>
  );
}
