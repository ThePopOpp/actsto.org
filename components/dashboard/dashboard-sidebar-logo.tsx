"use client";

import Link from "next/link";

import { ActLogo } from "@/components/act-logo";
import { cn } from "@/lib/utils";

type DashboardSidebarLogoProps = {
  /** Narrow rail (portal) vs wider admin rail */
  variant?: "portal" | "admin";
  className?: string;
};

export function DashboardSidebarLogo({ variant = "portal", className }: DashboardSidebarLogoProps) {
  const height = variant === "admin" ? "h-10" : "h-9";
  const maxW = variant === "admin" ? "max-w-[220px]" : "max-w-[200px]";

  return (
    <Link
      href="/"
      className={cn("relative block w-full shrink-0", height, maxW, className)}
      aria-label="Arizona Christian Tuition home"
    >
      <ActLogo sizes={variant === "admin" ? "220px" : "200px"} priority />
    </Link>
  );
}
