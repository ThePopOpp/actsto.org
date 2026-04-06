import Link from "next/link";
import {
  Briefcase,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Shield,
  User,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { isDashboardPreviewEnabled } from "@/lib/auth/admin-ui-preview";
import { cn } from "@/lib/utils";

const portals: {
  role: string;
  title: string;
  description: string;
  next: string;
  icon: typeof User;
}[] = [
  {
    role: "parent",
    title: "Parent / Guardian",
    description: "Campaigns, students, donations received, messages",
    next: "/dashboard/parent",
    icon: Heart,
  },
  {
    role: "student",
    title: "Student (16+)",
    description: "Your campaign, supporters, updates",
    next: "/dashboard/student",
    icon: GraduationCap,
  },
  {
    role: "donor_individual",
    title: "Individual Donor",
    description: "Giving history, tax documents, saved campaigns",
    next: "/dashboard/donor",
    icon: User,
  },
  {
    role: "donor_business",
    title: "Business Donor",
    description: "Corporate giving, receipts, sponsorships",
    next: "/dashboard/business",
    icon: Briefcase,
  },
];

export function DashboardHub({ error }: { error?: string }) {
  const previewOn = isDashboardPreviewEnabled();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LayoutDashboard className="size-6" />
        </div>
        <h1 className="mt-4 font-heading text-3xl font-semibold text-primary">
          Dashboard
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
          Sign in to open your portal. If you&apos;re not signed in yet, choose your account type
          — we&apos;ll send you to the right login and dashboard.
        </p>
      </div>

      {error ? (
        <p className="mx-auto mt-6 max-w-lg rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {error === "forbidden" && "You don’t have access to that dashboard."}
          {error === "admin" && "Super Admin access is restricted. Sign in with an authorized email."}
          {!["forbidden", "admin"].includes(error ?? "") && "Something went wrong. Try signing in again."}
        </p>
      ) : null}

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {portals.map((p) => {
          const href = `/login?role=${encodeURIComponent(p.role)}&next=${encodeURIComponent(p.next)}`;
          return (
            <Card key={p.role} className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <p.icon className="size-5 text-primary" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <CardTitle className="font-heading text-lg text-primary">{p.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={href} className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}>
                  Sign in to this portal
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {previewOn ? (
        <Card className="mt-10 border-border/80 bg-muted/20">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Preview dashboards (no sign-in)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Same sample UI you&apos;ll see after login — for design review only. Disabled outside
              development unless <code className="rounded bg-muted px-1 text-xs">ADMIN_UI_PREVIEW=true</code>.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/parent-preview"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Parent
            </Link>
            <Link
              href="/dashboard/student-preview"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Student
            </Link>
            <Link
              href="/dashboard/donor-preview"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Individual donor
            </Link>
            <Link
              href="/dashboard/business-preview"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Business donor
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-10 border-dashed border-primary/40 bg-muted/30">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-start gap-3">
            <Shield className="size-8 shrink-0 text-primary" />
            <div>
              <p className="font-heading font-semibold text-primary">Super Admin</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Authorized operators only. Your email must be listed in{" "}
                <code className="rounded bg-muted px-1 text-xs">ADMIN_EMAILS</code>.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Link
              href="/login?role=super_admin&next=/dashboard/admin"
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              Super admin sign in
            </Link>
            {previewOn ? (
              <Link
                href="/dashboard/admin-preview"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Open Super Admin UI preview (no sign-in)
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
