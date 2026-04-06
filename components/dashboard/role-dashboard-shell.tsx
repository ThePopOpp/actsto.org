"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

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
  /** Unauthenticated UI preview — banner + “Exit preview” only. */
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
      <nav className="flex flex-col gap-0.5">
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

  return (
    <div className="min-h-[calc(100dvh-0px)] bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {ROLE_LABEL[session.role]}
              {previewMode ? (
                <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-200">
                  Preview
                </span>
              ) : null}
            </p>
            <p className="font-heading text-lg font-semibold text-primary">
              Welcome, {session.name}
            </p>
            <p className="text-xs text-muted-foreground">{session.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Back to site
            </Link>
            <Button type="button" variant="secondary" size="sm" onClick={() => void signOut()}>
              {previewMode ? "Exit preview" : "Sign out"}
            </Button>
          </div>
        </div>
      </header>

      {!previewMode ? <PortalAccountSwitcher session={session} /> : null}

      {previewMode ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-950 dark:text-amber-100 sm:px-6">
          UI preview — not signed in. Use the sidebar to explore each section.
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-background py-6 lg:block">
          <div className="px-3 pb-4">
            <p className="mb-2 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Menu
            </p>
            <NavLinks />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="border-b border-border bg-background px-4 py-3 lg:hidden">
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
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b border-border p-4 text-left">
                  <SheetTitle className="font-heading">Dashboard</SheetTitle>
                </SheetHeader>
                <div className="p-3">
                  <NavLinks onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
