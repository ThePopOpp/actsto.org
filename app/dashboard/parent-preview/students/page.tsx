import Link from "next/link";

import { DashboardSectionPlaceholder } from "@/components/dashboard/dashboard-section-placeholder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const ROWS = [
  { name: "Jace Waters", grade: "5th Grade", school: "Valley Christian Schools", campaign: "waters-family-fundraiser" },
  { name: "Olivia Rivera", grade: "2nd Grade", school: "Valley Christian Schools", campaign: "waters-family-fundraiser" },
];

export default function ParentPreviewStudentsPage() {
  return (
    <div className="space-y-6">
      <DashboardSectionPlaceholder
        title="Students"
        description="Students linked to your account appear here. Grant campaign editing to teens 16+ when appropriate."
      />
      <div className="flex justify-end">
        <Link href="/register/student" className={cn(buttonVariants({ size: "sm" }))}>
          Add student
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {ROWS.map((r) => (
          <Card key={r.name} className="border-border/80">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="font-heading text-base text-primary">{r.name}</CardTitle>
                <Badge variant="secondary">{r.grade}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{r.school}</p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/parent-preview/campaigns/${r.campaign}/edit`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Manage campaign
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
