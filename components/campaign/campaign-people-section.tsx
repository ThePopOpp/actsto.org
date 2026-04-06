import Image from "next/image";
import Link from "next/link";
import { Eye, Mail, Phone } from "lucide-react";

import { StudentFundingCard } from "@/components/student-funding-card";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import type { CampaignStudent } from "@/lib/campaigns";
import { cn } from "@/lib/utils";

function parentInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

function telHref(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:+${digits}`;
}

const cardShell =
  "h-full rounded-2xl border-border/80 bg-card shadow-sm ring-1 ring-foreground/5";

export function CampaignPeopleSection({
  parent,
  students,
}: {
  parent: { name: string; email: string; phone: string; photo?: string };
  students: CampaignStudent[];
}) {
  const studentCount = students.length;
  const phoneLink = telHref(parent.phone);

  return (
    <div
      className={cn(
        "grid gap-4 md:grid-cols-2 md:items-stretch",
        studentCount === 0 && "md:grid-cols-1"
      )}
    >
      <Card className={cardShell}>
        <CardContent className="flex h-full flex-col space-y-4 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
              {parent.photo ? (
                <Image src={parent.photo} alt="" fill className="object-cover" sizes="56px" />
              ) : (
                <span className="flex size-full items-center justify-center bg-primary/10 font-heading text-sm font-semibold text-primary">
                  {parentInitials(parent.name)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-heading text-lg font-semibold text-primary">{parent.name}</h3>
              <p className="text-sm font-semibold text-act-red">Campaign Manager | Parent</p>
            </div>
          </div>

          <div className="mt-auto space-y-2 pt-1">
            {phoneLink ? (
              <a
                href={phoneLink}
                className={cn(
                  buttonVariants({ variant: "cta", size: "lg" }),
                  "flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold"
                )}
              >
                <Phone className="size-4 shrink-0" aria-hidden />
                Call Parent
              </a>
            ) : (
              <span
                className={cn(
                  buttonVariants({ variant: "cta", size: "lg" }),
                  "flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold opacity-60"
                )}
              >
                <Phone className="size-4 shrink-0" aria-hidden />
                Call Parent
              </span>
            )}
            <a
              href={`mailto:${encodeURIComponent(parent.email)}`}
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary hover:text-primary"
              )}
            >
              <Mail className="size-4 shrink-0" aria-hidden />
              Send Email
            </a>
            <Link
              href="/campaigns"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold"
              )}
            >
              <Eye className="size-4 shrink-0" aria-hidden />
              View Campaigns
            </Link>
          </div>
        </CardContent>
      </Card>

      {students.length > 0 ? (
        <div className="flex min-h-0 flex-col gap-4">
          {students.map((s) => (
            <StudentFundingCard
              key={`${s.firstName}-${s.lastName}`}
              firstName={s.firstName}
              lastName={s.lastName}
              nickname={s.nickname}
              grade={s.gradeDisplay}
              school={s.school}
              photo={s.photo}
              avatarInitials={s.avatarInitials}
              individualGoal={s.individualGoal}
              individualRaised={s.individualRaised}
              className={cardShell}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
