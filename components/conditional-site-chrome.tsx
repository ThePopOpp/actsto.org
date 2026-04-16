"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { ActSession } from "@/lib/auth/types";

function isDashboardPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function ConditionalSiteChrome({
  user,
  children,
}: {
  user: ActSession | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const dashboard = isDashboardPath(pathname);

  if (dashboard) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader user={user} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
