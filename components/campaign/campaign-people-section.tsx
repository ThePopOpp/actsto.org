import Image from "next/image";
import { StudentFundingCard } from "@/components/student-funding-card";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignManagerActions } from "@/components/campaign/campaign-manager-actions";
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
  campaignSlug,
  reviewsEnabled,
}: {
  parent: { id?: string; name: string; email: string; phone: string; photo?: string };
  students: CampaignStudent[];
  campaignSlug: string;
  reviewsEnabled: boolean;
}) {
  const studentCount = students.length;
  const phoneLink = telHref(parent.phone) ?? null;

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
                parent.photo.startsWith("data:") ? (
                  // Avatars uploaded through the profile editor are stored as
                  // data URLs. next/image can't optimise those and errors on
                  // some of them, so render them directly.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={parent.photo} alt="" className="size-full object-cover" />
                ) : (
                  <Image src={parent.photo} alt="" fill className="object-cover" sizes="56px" />
                )
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

          <CampaignManagerActions
            campaignSlug={campaignSlug}
            parentId={parent.id}
            parentName={parent.name}
            phoneLink={phoneLink}
            reviewsEnabled={reviewsEnabled}
          />
        </CardContent>
      </Card>

      {students.length > 0 ? (
        <div className="flex min-h-0 flex-col gap-4">
          {students.map((s) => (
            <StudentFundingCard
              key={s.id ?? `${s.firstName}-${s.lastName}-${s.gradeDisplay}`}
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
