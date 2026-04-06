import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import { TeamMemberCard } from "@/components/about/team-member-card";
import { buttonVariants } from "@/lib/button-variants";
import { leadershipTeam } from "@/lib/team-leadership";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Our Team",
  description: "Leadership at Arizona Christian Tuition—serving families, schools, and donors.",
};

export default function TeamPage() {
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
          <span className="font-medium text-foreground">Our Team</span>
        </nav>

        <h1 className="mt-8 font-heading text-4xl font-semibold text-primary">Our team</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">
          Detailed profiles—with About, stats, and Key Attributes—live on each person&apos;s page.
          Use{" "}
          <strong className="font-medium text-foreground">View full profile</strong> below, or open
          a link directly (for example{" "}
          <Link
            href="/team/jeremy-waters"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            /team/jeremy-waters
          </Link>
          ).
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Story and leadership cards:{" "}
          <Link href="/about-us#leadership" className="text-primary underline-offset-4 hover:underline">
            About Us
          </Link>
          .
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {leadershipTeam.map((member) => (
            <TeamMemberCard key={member.slug} member={member} />
          ))}
        </div>
        <p className="mt-12 text-center">
          <Link href="/contact" className={cn(buttonVariants({ variant: "outline" }), "min-w-[200px]")}>
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}
