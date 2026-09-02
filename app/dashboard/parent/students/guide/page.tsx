import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { StudentHowToWizard } from "@/components/dashboard/parent/student-howto-wizard";
import { getActSession } from "@/lib/auth/session-server";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Adding and removing students",
};

export default async function ParentStudentGuidePage() {
  const session = await getActSession();
  if (!session) redirect("/login?next=/dashboard/parent/students/guide");

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/parent/students"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
      >
        <ChevronLeft className="size-4" aria-hidden />
        Back to Students
      </Link>
      <StudentHowToWizard />
    </div>
  );
}
