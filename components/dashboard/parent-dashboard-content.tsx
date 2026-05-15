import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Eye,
  Heart,
  Mail,
  MessageSquare,
  Pencil,
  PlusCircle,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Campaign, CampaignStudent } from "@/lib/campaigns";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function percent(campaign: Campaign) {
  return campaign.goal > 0 ? Math.min(100, Math.round((campaign.raised / campaign.goal) * 100)) : 0;
}

function statusLabel(status: string | undefined) {
  if (!status) return "Active";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function campaignEditHref(basePath: string, campaign: Campaign) {
  return `${basePath}/campaigns/${campaign.slug}/edit`;
}

function studentName(student: CampaignStudent) {
  return [student.firstName, student.lastName].filter(Boolean).join(" ") || student.nickname || "Student";
}

export function ParentDashboardContent({
  campaigns = [],
  basePath = "/dashboard/parent",
}: {
  campaigns?: Campaign[];
  basePath?: string;
}) {
  const familyCampaigns = campaigns;
  const activeCampaigns = familyCampaigns.filter((campaign) => campaign.status !== "draft");
  const draftCampaigns = familyCampaigns.filter((campaign) => campaign.status === "draft");
  const incompleteCampaigns = familyCampaigns.filter(
    (campaign) => (campaign.completionPercent ?? 100) < 100 || (campaign.missingFields?.length ?? 0) > 0,
  );
  const totalRaised = familyCampaigns.reduce((sum, campaign) => sum + campaign.raised, 0);
  const totalGoal = familyCampaigns.reduce((sum, campaign) => sum + campaign.goal, 0);
  const totalDonors = familyCampaigns.reduce((sum, campaign) => sum + campaign.donorCount, 0);
  const progress = totalGoal > 0 ? Math.min(100, Math.round((totalRaised / totalGoal) * 100)) : 0;
  const closestCampaign = familyCampaigns
    .filter((campaign) => campaign.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];
  const studentRows = familyCampaigns.flatMap((campaign) =>
    campaign.students.map((student) => ({
      name: studentName(student),
      school: student.school || campaign.school.name,
      grade: student.gradeDisplay,
      campaignSlug: campaign.slug,
      raised: student.individualRaised || campaign.raised,
      goal: student.individualGoal || campaign.goal,
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground">
            Manage campaigns, invite donors, track tuition support, and respond to family messages in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/campaigns/new" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            <PlusCircle className="size-4" />
            Start campaign
          </Link>
          <Link href={`${basePath}/messages`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
            <Mail className="size-4" />
            Messages
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">{money(totalRaised)}</p>
              <p className="text-xs text-muted-foreground">Raised across campaigns</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">{totalDonors}</p>
              <p className="text-xs text-muted-foreground">Donors connected</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Heart className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">{familyCampaigns.length}</p>
              <p className="text-xs text-muted-foreground">
                {draftCampaigns.length} draft, {activeCampaigns.length} active
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                {closestCampaign ? closestCampaign.daysLeft : "-"}
              </p>
              <p className="text-xs text-muted-foreground">Days to closest campaign deadline</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-heading text-lg font-semibold text-primary">Overall campaign progress</p>
              <p className="text-sm text-muted-foreground">
                {money(totalRaised)} raised of {money(totalGoal)} total goals
              </p>
            </div>
            <Badge variant="secondary">{progress}%</Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {incompleteCampaigns.length > 0 ? (
        <Card className="border-act-red/30 bg-act-red/5">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incompleteCampaigns.slice(0, 3).map((campaign) => (
              <div
                key={campaign.slug}
                className="flex flex-col gap-3 rounded-lg border border-act-red/20 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-primary">{campaign.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {(campaign.missingFields ?? []).slice(0, 3).join(", ") || "Finish campaign setup before review."}
                  </p>
                </div>
                <Link href={campaignEditHref(basePath, campaign)} className={cn(buttonVariants({ size: "sm" }))}>
                  Continue setup
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/80">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-heading text-lg text-primary">Your campaigns</CardTitle>
            <p className="text-sm text-muted-foreground">Quickly share, edit, and review campaign performance.</p>
          </div>
          <Link href={`${basePath}/campaigns`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {familyCampaigns.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No campaigns yet. Start a campaign when you are ready, then return here to manage it.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Campaign</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Progress</th>
                    <th className="py-3 pr-4 font-medium">Donors</th>
                    <th className="py-3 pr-4 font-medium">Days</th>
                    <th className="py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {familyCampaigns.map((campaign) => (
                    <tr key={campaign.slug} className="border-b border-border/70 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                            <Image src={campaign.image} alt="" fill sizes="56px" className="object-cover" />
                          </div>
                          <div>
                            <p className="font-medium text-primary">{campaign.title}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{campaign.school.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={campaign.status === "draft" ? "secondary" : "outline"}>
                          {statusLabel(campaign.status)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="min-w-36">
                          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>{money(campaign.raised)}</span>
                            <span>{percent(campaign)}%</span>
                          </div>
                          <Progress value={percent(campaign)} className="h-2" />
                        </div>
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{campaign.donorCount}</td>
                      <td className="py-3 pr-4 tabular-nums">{campaign.daysLeft}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <Link href={`/campaigns/${campaign.slug}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                            <Eye className="size-4" />
                          </Link>
                          <Link href={campaignEditHref(basePath, campaign)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                            <Pencil className="size-4" />
                          </Link>
                          <Link href={`${basePath}/marketing`} className={cn(buttonVariants({ size: "sm" }))}>
                            <Send className="size-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-lg text-primary">Students</CardTitle>
            <Link href={`${basePath}/students`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Manage
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {studentRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground md:col-span-2">
                Students will appear here after you add them to a campaign.
              </div>
            ) : null}
            {studentRows.slice(0, 4).map((student) => {
              const studentPct = student.goal > 0 ? Math.min(100, Math.round((student.raised / student.goal) * 100)) : 0;
              return (
                <div key={`${student.name}-${student.campaignSlug}`} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-primary">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.school}</p>
                    </div>
                    <Badge variant="secondary">{student.grade}</Badge>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>{money(student.raised)} allocated</span>
                      <span>{studentPct}%</span>
                    </div>
                    <Progress value={studentPct} className="h-2" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-primary">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3 rounded-lg border border-border p-3">
              <Users className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="font-medium text-primary">Donor activity</p>
                <p className="text-muted-foreground">{totalDonors} donors across your campaigns.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg border border-border p-3">
              <MessageSquare className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="font-medium text-primary">Messages</p>
                <p className="text-muted-foreground">Review donor questions and family messages.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg border border-border p-3">
              <Mail className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="font-medium text-primary">Invite supporters</p>
                <p className="text-muted-foreground">Use marketing tools to send email, SMS, and share links.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
