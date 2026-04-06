import Link from "next/link";
import { redirect } from "next/navigation";

import { dashboardPathForRole } from "@/lib/auth/paths";
import { getActSession } from "@/lib/auth/session-server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function BackersPage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/backers");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={dashboardPathForRole(session.role)}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-6 -ml-2")}
      >
        ← Back to dashboard
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Backers</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Supporter and backer activity for your campaigns will appear here.
        </CardContent>
      </Card>
    </div>
  );
}
