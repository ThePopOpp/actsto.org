import Link from "next/link";
import { Clock } from "lucide-react";

import { HomeBelowHero } from "@/components/home/home-sections";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <>
      <div className="bg-background">
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20 lg:py-24">
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="size-4 shrink-0" aria-hidden />
            Donate Today — It Only Takes 3 Minutes
          </p>
          <h1 className="mt-6 font-heading text-4xl leading-tight font-semibold tracking-tight text-primary sm:text-5xl md:text-[3.25rem] md:leading-[1.15]">
            Turn Your Arizona Taxes Into{" "}
            <span className="text-act-red dark:text-[#9ab7f2]">Private Christian Education</span>{" "}
            &amp; Tuition
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Your state tax dollars can fund a child&apos;s education instead of the general
            fund. Through Arizona&apos;s tax credit program, you can give and get back — helping
            students and families without spending anything beyond what you already owe in state
            taxes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className={cn(buttonVariants({ size: "lg" }), "min-w-[160px] px-6")}
            >
              Get Started
            </Link>
            <Link
              href="/campaigns"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-w-[160px] border-primary bg-background text-primary hover:bg-primary/5"
              )}
            >
              Donate Today
            </Link>
          </div>
        </section>
      </div>
      <HomeBelowHero />
    </>
  );
}
