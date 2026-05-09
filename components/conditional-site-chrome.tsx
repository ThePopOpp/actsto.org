"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { ActSession } from "@/lib/auth/types";
import type { SiteCtaBlockData } from "@/lib/site-cta-block-types";

function isDashboardPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
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
  const dashboard = isDashboardPath(pathname);

  if (dashboard) {
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
