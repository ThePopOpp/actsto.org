"use client";

import Image from "next/image";
import Link from "next/link";

import { ACT_LOGO_FULL } from "@/lib/constants";
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
      <Image
        src={ACT_LOGO_FULL}
        alt="Arizona Christian Tuition"
        fill
        className="object-contain object-left"
        sizes={variant === "admin" ? "220px" : "200px"}
        priority
      />
    </Link>
  );
}
