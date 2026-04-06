import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, Sparkles } from "lucide-react";

import { TeamMemberCard } from "@/components/about/team-member-card";
import { buttonVariants } from "@/lib/button-variants";
import { leadershipTeam } from "@/lib/team-leadership";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Arizona Christian Tuition was founded by Arizona dads who believed every family deserves access to private Christian education.",
};

export default function AboutUsPage() {
  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-act-banner/40 to-background dark:from-act-banner/10">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
            About Arizona Christian Tuition
          </h1>
          <p className="mx-auto mt-6 text-lg leading-relaxed text-muted-foreground">
            Arizona Christian Tuition (ACT) was founded by three Arizona dads who shared a common
            challenge—and a shared conviction. As fathers, we deeply desired to place our children in
            a private Christian school, but like many families, we faced the financial reality that
            tuition was simply out of reach. Rather than accepting that limitation, we chose to lean
            into our combined skills, experience, and faith to create a solution—not just for our own
            families, but for countless others across the Valley.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className={cn(buttonVariants({ size: "lg" }), "min-w-[180px] px-8")}
            >
              Get started
            </Link>
            <Link
              href="/campaigns"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-w-[180px] border-primary bg-background text-primary hover:bg-primary/5"
              )}
            >
              Support a campaign
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card p-6 shadow-sm ring-1 ring-foreground/5 sm:p-8">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-heading text-xl font-semibold text-primary">Why we exist</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Tax-credit scholarships put your Arizona tax dollars to work for students—not the
              general fund. We exist to make that path understandable for families, reliable for
              schools, and meaningful for donors who want to see their giving change lives in their
              communities.
            </p>
            <Link
              href="/how-it-works"
              className={cn(
                buttonVariants({ variant: "link", size: "sm" }),
                "mt-3 h-auto px-0 text-act-red"
              )}
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/40 py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-act-red/10 text-act-red">
              <HeartHandshake className="size-6" aria-hidden />
            </span>
            <h2 className="mt-4 font-heading text-2xl font-semibold text-primary sm:text-3xl">
              Join families, schools, and donors making tuition possible
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Whether you are applying for a scholarship, recommending a student, or giving through
              Arizona tax credits, we are here to help you take the next step with confidence.
            </p>
            <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                Talk to our team
              </Link>
              <Link
                href="/faq"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full border-primary bg-background sm:w-auto"
                )}
              >
                Read the FAQ
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="leadership"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold text-primary">Leadership team</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Meet the people guiding Arizona Christian Tuition—committed to integrity, service, and
            expanding access to Christian education across the Valley.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {leadershipTeam.map((member) => (
            <TeamMemberCard key={member.slug} member={member} />
          ))}
        </div>
      </section>

      <section className="bg-primary py-14 text-primary-foreground sm:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
            Ready to put your taxes to work for Christian education?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-primary-foreground/85 sm:text-base">
            Create an account to apply, donate, or launch a campaign—three minutes can change a
            student&apos;s school year.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "min-w-[180px] bg-background text-primary hover:bg-background/90"
              )}
            >
              Get started free
            </Link>
            <Link
              href="/campaigns"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-w-[180px] border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              )}
            >
              Browse campaigns
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
