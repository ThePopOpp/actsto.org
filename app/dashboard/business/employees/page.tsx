import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getActSession } from "@/lib/auth/session-server";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

/**
 * Who can sign in to this business account. Today that is the account holder
 * only; colleagues are added by our team on request. The page used to list
 * three invented employees.
 */
export default async function BusinessEmployeesPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/business/employees");

  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Employees"
        description="People who can sign in to your company's giving records, receipts and invoices."
      />
      <Card className="overflow-hidden border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Access</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 font-medium text-primary">{session.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{session.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">Account holder</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          To give a colleague access, such as someone in your finance team, ask us and we&apos;ll set it up.
        </p>
        <Link href="/contact" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Request access for a colleague
        </Link>
      </div>
    </div>
  );
}
