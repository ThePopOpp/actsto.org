"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  firstName: string;
  lastName: string;
  nickname?: string;
  grade: string;
  school: string;
  photo?: string;
  /** Shown in the avatar when there is no photo (e.g. nickname-based monogram) */
  avatarInitials?: string;
  individualGoal: number;
  individualRaised: number;
  className?: string;
};

function initials(firstName: string, lastName: string) {
  const a = firstName.trim()[0] ?? "";
  const b = lastName.trim()[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function StudentFundingCard({
  firstName,
  lastName,
  nickname,
  grade,
  school,
  photo,
  avatarInitials,
  individualGoal,
  individualRaised,
  className,
}: Props) {
  const displayName = `${firstName} ${lastName}`.trim();
  const pct =
    individualGoal > 0
      ? Math.min(100, Math.round((individualRaised / individualGoal) * 100))
      : 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(t);
  }, [pct]);

  const hasPhoto = Boolean(photo);
  const monogram = (avatarInitials?.trim() || initials(firstName, lastName)).toUpperCase();

  return (
    <Card className={cn("rounded-2xl border-border/80 bg-card shadow-sm", className)}>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            {hasPhoto && photo ? (
              <Image src={photo} alt="" fill className="object-cover" sizes="56px" />
            ) : (
              <span className="flex size-full items-center justify-center bg-primary/10 font-heading text-sm font-semibold text-primary">
                {monogram}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-semibold text-primary">{displayName}</h3>
            {nickname ? (
              <p className="mt-0.5 text-sm font-semibold text-act-red">&ldquo;{nickname}&rdquo;</p>
            ) : null}
          </div>
        </div>
        <dl className="grid gap-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Grade Level</dt>
            <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{grade}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">School Name</dt>
            <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{school}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Individual Goal</dt>
            <dd className="text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">
              ${individualGoal.toLocaleString()}
            </dd>
          </div>
        </dl>
        <div>
          <div className="mb-1.5 flex justify-between text-sm font-medium">
            <span className="text-slate-500 dark:text-slate-400">Progress</span>
            <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-act-red transition-[width] duration-1000 ease-out motion-reduce:transition-none"
              style={{ width: `${width}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-500 tabular-nums dark:text-slate-400">
            ${individualRaised.toLocaleString()} raised toward this student&apos;s portion
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
