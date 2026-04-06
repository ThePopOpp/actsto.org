import Link from "next/link";
import { Heart, Mail, PlusCircle, TrendingUp, Users } from "lucide-react";

import { CampaignCard } from "@/components/campaign-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MOCK_CAMPAIGNS } from "@/lib/campaigns";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const MOCK_STUDENTS = [
  {
    name: "Jace Waters",
    school: "Valley Christian Schools",
    grade: "5th Grade",
    campaignSlug: "waters-family-fundraiser",
    raised: 3750,
    goal: 15000,
  },
  {
    name: "Olivia Rivera",
    school: "Valley Christian Schools",
    grade: "2nd Grade",
    campaignSlug: "waters-family-fundraiser",
    raised: 0,
    goal: 5000,
  },
];

export function ParentDashboardContent() {
  const familyCampaigns = MOCK_CAMPAIGNS.filter((c) =>
    ["waters-family-fundraiser", "leavitt-family-fundraiser"].includes(c.slug)
  );
  const totalRaised = familyCampaigns.reduce((s, c) => s + c.raised, 0);
  const totalGoal = familyCampaigns.reduce((s, c) => s + c.goal, 0);

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        Manage your students&apos; campaigns, track tuition support, and respond to donor messages —
        all in one place.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                ${totalRaised.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Raised across active campaigns</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">2</p>
              <p className="text-xs text-muted-foreground">Students on your account</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-primary">3</p>
              <p className="text-xs text-muted-foreground">Unread messages (sample)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-primary">My students</h2>
          <Link
            href="/register/student"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Add student
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {MOCK_STUDENTS.map((s) => {
            const pct = s.goal > 0 ? Math.min(100, Math.round((s.raised / s.goal) * 100)) : 0;
            return (
              <Card key={s.name} className="border-border/80">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-heading text-base text-primary">{s.name}</CardTitle>
                    <Badge variant="secondary">{s.grade}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.school}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Family goal progress</span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    <Progress value={pct} className="mt-1.5 h-2" />
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      ${s.raised.toLocaleString()} of ${s.goal.toLocaleString()} allocated
                    </p>
                  </div>
                  <Link
                    href={`/campaigns/${s.campaignSlug}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full sm:w-auto")}
                  >
                    View campaign
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-primary">Active campaigns</h2>
          <Link href="/campaigns/new" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            <PlusCircle className="size-4" />
            Start a campaign
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {familyCampaigns.map((c) => (
            <CampaignCard key={c.slug} campaign={c} variant="listing" />
          ))}
        </div>
      </div>

      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Heart className="size-8 shrink-0 text-act-red" />
            <div>
              <p className="font-medium text-primary">Thank your donors</p>
              <p className="text-sm text-muted-foreground">
                Post an update so supporters see how their gifts are helping this semester.
              </p>
            </div>
          </div>
          <Link
            href="/campaigns/waters-family-fundraiser"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Post update
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
