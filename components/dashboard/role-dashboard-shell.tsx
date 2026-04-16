"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { DashboardSidebarLogo } from "@/components/dashboard/dashboard-sidebar-logo";
import { ModeToggle } from "@/components/mode-toggle";
import { PortalAccountSwitcher } from "@/components/dashboard/portal-account-switcher";
import { ROLE_LABEL, type ActSession } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/lib/button-variants";
import { getRoleNavItems } from "@/lib/dashboard/role-nav";
import { cn } from "@/lib/utils";

const dashboardFont = "font-[var(--font-roboto)]";

export function RoleDashboardShell({
  session,
  children,
  basePath,
  previewMode = false,
}: {
  session: ActSession;
  children: React.ReactNode;
  /** e.g. `/dashboard/parent` or `/dashboard/parent-preview` */
  basePath: string;
  /** Unauthenticated UI preview — single-line welcome banner + “Exit preview”. */
  previewMode?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = getRoleNavItems(session.role, basePath);
  const rootHref = basePath.replace(/\/$/, "");

  function isActive(href: string) {
    const h = href.replace(/\/$/, "");
    const p = pathname.replace(/\/$/, "");
    if (h === rootHref) return p === h;
    return p === h || p.startsWith(`${h}/`);
  }

  async function signOut() {
    if (previewMode) {
      window.location.href = "/";
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className={cn("flex flex-col gap-0.5", dashboardFont)}>
        {nav.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  const sidebarFooter = (
    <div className={cn("space-y-3 border-t border-border px-3 py-4", dashboardFont)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Theme</span>
        <ModeToggle />
      </div>
      <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center")}>
        Back to site
      </Link>
      <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => void signOut()}>
        {previewMode ? "Exit preview" : "Sign out"}
      </Button>
    </div>
  );

  return (
    <div className={cn("flex min-h-dvh bg-muted/30", dashboardFont)}>
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border px-4 py-4">
            <DashboardSidebarLogo />
          </div>

          {!previewMode ? <PortalAccountSwitcher session={session} layout="sidebar" /> : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <NavLinks />
          </div>

          {sidebarFooter}
        </div>
      </aside>

      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "inline-flex gap-2"
              )}
            >
              <Menu className="size-4" />
              Menu
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
              <SheetHeader className="border-b border-border p-4 text-left">
                <SheetTitle className="sr-only">Dashboard menu</SheetTitle>
                <DashboardSidebarLogo />
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {!previewMode ? <PortalAccountSwitcher session={session} layout="sidebar" /> : null}
                  <NavLinks onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className={cn("border-t border-border p-3", dashboardFont)}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Theme</span>
                    <ModeToggle />
                  </div>
                  <Link
                    href="/"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mb-2 w-full justify-center")}
                    onClick={() => setMobileOpen(false)}
                  >
                    Back to site
                  </Link>
                  <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => void signOut()}>
                    {previewMode ? "Exit preview" : "Sign out"}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <span className="truncate text-sm font-semibold text-primary">{ROLE_LABEL[session.role]}</span>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {previewMode ? (
            <div
              className="mb-4 rounded-lg border border-amber-500/35 bg-amber-50/90 px-4 py-3 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
              role="status"
            >
              <p className="text-center text-sm text-foreground whitespace-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="font-semibold">Welcome, {session.name}</span>
                <span aria-hidden className="mx-2 text-muted-foreground">
                  ·
                </span>
                <span className="font-normal text-muted-foreground">{session.email}</span>
              </p>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
