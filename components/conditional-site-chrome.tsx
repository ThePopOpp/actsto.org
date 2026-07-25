"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { ActSession } from "@/lib/auth/types";
import type { SiteCtaBlockData } from "@/lib/site-cta-block-types";

function isBareLayoutPath(pathname: string | null): boolean {
  if (!pathname) return false;
  // Dashboard renders its own shell; the public digital business card (/c/<slug>)
  // is a standalone, chrome-free page (no site header or footer).
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/c" ||
    pathname.startsWith("/c/")
  );
}

export function ConditionalSiteChrome({
  user,
  headerCtas,
  children,
}: {
  user: ActSession | null;
  headerCtas?: {
    primary?: SiteCtaBlockData | null;
    secondary?: SiteCtaBlockData | null;
    mobileExtra?: SiteCtaBlockData | null;
  };
  children: ReactNode;
}) {
  const pathname = usePathname();

  if (isBareLayoutPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader user={user} ctas={headerCtas} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
