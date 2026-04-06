import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeCheck,
  ChevronRight,
  Clock,
  Globe,
  Handshake,
  Home,
  Mail,
  MessagesSquare,
  Settings,
  Shield,
  Sparkles,
  Star,
  Target,
  Workflow,
} from "lucide-react";

import { FacebookIcon, LinkedInIcon } from "@/components/icons/social-brand-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KeyAttributeIcon, LeadershipMember } from "@/lib/team-leadership";
import { cn } from "@/lib/utils";

const KEY_ICONS: Record<KeyAttributeIcon, LucideIcon> = {
  shield: Shield,
  globe: Globe,
  activity: Activity,
  target: Target,
  handshake: Handshake,
  sparkles: Sparkles,
  workflow: Workflow,
  "messages-square": MessagesSquare,
  "badge-check": BadgeCheck,
};

function SocialRow({
  href,
  label,
  icon,
  external,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
}) {
  const className = cn(
    "flex w-full items-center justify-between rounded-xl border border-border/80 bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
  );
  const inner = (
    <>
      <span className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center text-muted-foreground">
          {icon}
        </span>
        {label}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <a href={href} className={className}>
      {inner}
    </a>
  );
}

export function TeamMemberBioView({ member }: { member: LeadershipMember }) {
  const mailto = `mailto:${encodeURIComponent(member.email)}`;

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md transition-colors hover:text-foreground"
          >
            <Home className="size-4" aria-hidden />
            <span className="sr-only">Home</span>
          </Link>
          <ChevronRight className="size-3.5 opacity-60" aria-hidden />
          <Link href="/about-us#leadership" className="hover:text-foreground">
            About Us
          </Link>
          <ChevronRight className="size-3.5 opacity-60" aria-hidden />
          <span className="font-medium text-foreground">{member.name}</span>
        </nav>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start">
          <aside className="lg:sticky lg:top-24">
            <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm ring-1 ring-foreground/5">
              <CardContent className="flex flex-col items-center px-5 pt-8 pb-6 sm:px-6">
                <div className="flex flex-col items-center">
                  <div className="relative size-32 overflow-hidden rounded-full border border-border bg-muted shadow-sm">
                    <Image
                      src={member.imageSrc}
                      alt={`Portrait of ${member.name}`}
                      fill
                      className="object-cover"
                      sizes="128px"
                      priority
                    />
                  </div>
                  <span
                    className="mt-2 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card shadow-sm"
                    title="Active"
                    aria-hidden
                  />
                </div>

                <h1 className="mt-5 text-center font-heading text-2xl font-semibold text-primary">
                  {member.name}
                </h1>

                <span
                  className="mt-2 inline-flex items-center gap-1 rounded-full border border-act-red/35 bg-act-red/10 px-2.5 py-0.5 text-xs font-semibold text-act-red"
                >
                  <Settings className="size-3" aria-hidden />
                  {member.role}
                </span>

                <p className="mt-2 text-center text-sm text-muted-foreground">{member.organization}</p>

                <div className="mt-6 grid w-full grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted/70 px-3 py-3 text-center ring-1 ring-border/60">
                    <p className="font-heading text-xl font-semibold tabular-nums text-primary">
                      {member.stats.campaignCount}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">Campaigns</p>
                  </div>
                  <div className="rounded-xl bg-muted/70 px-3 py-3 text-center ring-1 ring-border/60">
                    <p className="font-heading text-xl font-semibold tabular-nums text-primary">
                      {member.stats.tenureYears}yr
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">Tenure</p>
                  </div>
                </div>

                <div className="mt-6 w-full space-y-2 border-t border-border/60 pt-6">
                  <SocialRow
                    href={member.facebookUrl}
                    label="Facebook"
                    icon={<FacebookIcon className="size-5" />}
                    external
                  />
                  <SocialRow
                    href={member.linkedinUrl}
                    label="LinkedIn"
                    icon={<LinkedInIcon className="size-5" />}
                    external
                  />
                  <SocialRow href={mailto} label="Email" icon={<Mail className="size-5" />} />
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="min-w-0 space-y-6">
            <Card className="rounded-2xl border-border/80 shadow-sm ring-1 ring-foreground/5">
              <CardHeader className="flex flex-row items-center gap-2 border-b border-border/60 pb-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
                <CardTitle className="font-heading text-lg text-primary">About</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <p className="text-base leading-relaxed text-muted-foreground">{member.bio}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/80 shadow-sm ring-1 ring-foreground/5">
              <CardHeader className="flex flex-row items-center gap-2 border-b border-border/60 pb-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Star className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
                <CardTitle className="font-heading text-lg text-primary">Key Attributes</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-5 pb-6 sm:grid-cols-3">
                {member.keyAttributes.map((attr) => {
                  const Icon = KEY_ICONS[attr.icon];
                  return (
                    <div
                      key={attr.title}
                      className="flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm ring-1 ring-foreground/5"
                    >
                      <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                      </span>
                      <h3 className="mt-3 font-heading text-base font-semibold text-primary">
                        {attr.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
                        {attr.description}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
