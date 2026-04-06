import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";

import { FacebookIcon, LinkedInIcon } from "@/components/icons/social-brand-icons";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import type { LeadershipMember } from "@/lib/team-leadership";
import { cn } from "@/lib/utils";

export function TeamMemberCard({ member }: { member: LeadershipMember }) {
  const mailto = `mailto:${encodeURIComponent(member.email)}`;

  return (
    <Card className="h-full rounded-2xl border-border/80 shadow-sm ring-1 ring-foreground/5">
      <CardContent className="flex flex-col items-center px-5 pt-6 pb-5 text-center sm:px-6">
        <div className="relative size-28 shrink-0 overflow-hidden rounded-full border border-border bg-muted shadow-inner">
          <Image
            src={member.imageSrc}
            alt={`Portrait of ${member.name}`}
            fill
            className="object-cover"
            sizes="112px"
          />
        </div>
        <h3 className="mt-4 font-heading text-xl font-semibold text-primary">{member.name}</h3>
        <p className="text-sm font-semibold text-act-red">{member.role}</p>
        <p className="mt-3 line-clamp-3 min-h-0 w-full text-sm leading-relaxed text-muted-foreground">
          {member.excerpt}
        </p>

        <Link
          href={`/team/${member.slug}`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "group/profile mt-5 w-full max-w-[240px] gap-2"
          )}
        >
          View full profile
          <ArrowRight className="size-4 transition-transform group-hover/profile:translate-x-0.5" />
        </Link>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <a
            href={member.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "size-10 rounded-full border-border/80"
            )}
            aria-label={`${member.name} on Facebook`}
          >
            <FacebookIcon />
          </a>
          <a
            href={member.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "size-10 rounded-full border-border/80"
            )}
            aria-label={`${member.name} on LinkedIn`}
          >
            <LinkedInIcon />
          </a>
          <a
            href={mailto}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "size-10 rounded-full border-border/80"
            )}
            aria-label={`Email ${member.name}`}
          >
            <Mail className="size-4" aria-hidden />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
