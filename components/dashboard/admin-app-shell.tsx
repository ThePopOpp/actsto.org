"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  FileText,
  Images,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  Newspaper,
  Receipt,
  Scale,
  Settings,
  Users,
} from "lucide-react";

import type { ActSession } from "@/lib/auth/types";
import { DashboardSidebarLogo } from "@/components/dashboard/dashboard-sidebar-logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { adminHrefForBase } from "@/lib/dashboard/admin-base-path";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const dashboardFont = "font-[var(--font-roboto)]";

const nav = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/admin/users", label: "Users", icon: Users },
  { href: "/dashboard/admin/credentials", label: "API & credentials", icon: KeyRound },
  { href: "/dashboard/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/admin/billing", label: "Billing · PayPal", icon: CreditCard },
  { href: "/dashboard/admin/sms", label: "SMS · Twilio", icon: MessageSquare },
  { href: "/dashboard/admin/messages", label: "Inbox", icon: Mail },
  { href: "/dashboard/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/dashboard/admin/cms", label: "Site & content", icon: FileText },
  { href: "/dashboard/admin/legal", label: "Legal", icon: Scale },
  { href: "/dashboard/admin/marketing", label: "Marketing", icon: Images },
  { href: "/dashboard/admin/cta-builder", label: "CTA blocks", icon: LayoutTemplate },
  { href: "/dashboard/admin/blog-post", label: "New blog post", icon: Newspaper },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({
  basePath,
  onNavigate,
  className,
}: {
  basePath: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const overviewHref = adminHrefForBase("/dashboard/admin", basePath);

  return (
    <nav className={cn("flex flex-col gap-0.5", dashboardFont, className)}>
      {nav.map(({ href, label, icon: Icon }) => {
        const mappedHref = adminHrefForBase(href, basePath);
        const isActive =
          mappedHref === overviewHref
            ? pathname === overviewHref
            : pathname === mappedHref || pathname.startsWith(`${mappedHref}/`);
        return (
          <Link
            key={href}
            href={mappedHref}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground dark:bg-white/15 dark:text-white"
                : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
            )}
          >
            <Icon className="size-4 shrink-0 opacity-90" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const DEFAULT_ADMIN_BASE = "/dashboard/admin";

export function AdminAppShell({
  user,
  children,
  basePath = DEFAULT_ADMIN_BASE,
  previewMode = false,
}: {
  user: ActSession;
  children: React.ReactNode;
  /** Defaults to `/dashboard/admin`; use `/dashboard/admin-preview` for the UI preview route. */
  basePath?: string;
  /** When true, “Sign out” becomes “Exit preview” and skips the logout API. */
  previewMode?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    if (previewMode) {
      window.location.href = "/";
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className={cn("flex min-h-dvh bg-muted/30", dashboardFont)}>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh min-h-0 w-64 shrink-0 flex-col border-r border-border py-6 md:flex",
          /* Light: navy primary. Dark: shadcn inverts --primary to near-white — keep brand navy for this shell. */
          "bg-primary text-primary-foreground",
          "dark:border-white/10 dark:bg-[var(--act-brand-navy-dark)] dark:text-white"
        )}
      >
        <div className="shrink-0 px-4">
          <DashboardSidebarLogo variant="admin" />
        </div>
        <Separator className="my-4 bg-primary-foreground/15 dark:bg-white/15" />
        <NavLinks basePath={basePath} className="min-h-0 flex-1 overflow-y-auto px-3" />
        <Separator className="my-4 bg-primary-foreground/15 dark:bg-white/15" />
        <div className="mt-auto space-y-3 px-4 text-xs text-primary-foreground/75 dark:text-white/75">
          <div className="flex items-center justify-between gap-2">
            <span className="text-primary-foreground/80 dark:text-white/80">Theme</span>
            <ModeToggle />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 dark:border-white/30 dark:text-white dark:hover:bg-white/10"
            onClick={() => void signOut()}
          >
            {previewMode ? "Exit preview" : "Sign out"}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background"
              )}
            >
              <Menu className="size-4" />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-primary bg-primary p-0 text-primary-foreground dark:border-white/10 dark:bg-[var(--act-brand-navy-dark)] dark:text-white"
            >
              <SheetHeader className="border-b border-primary-foreground/10 p-4 text-left dark:border-white/10">
                <SheetTitle className="sr-only">Admin menu</SheetTitle>
                <DashboardSidebarLogo variant="admin" />
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col p-3">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <NavLinks basePath={basePath} onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="mt-auto space-y-3 border-t border-primary-foreground/15 pt-4 text-xs dark:border-white/15">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-primary-foreground/80 dark:text-white/80">Theme</span>
                    <ModeToggle />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-primary-foreground/30 bg-transparent text-primary-foreground dark:border-white/30 dark:text-white dark:hover:bg-white/10"
                    onClick={() => void signOut()}
                  >
                    {previewMode ? "Exit preview" : "Sign out"}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <span className="truncate font-heading text-sm font-semibold text-primary">
            Super Admin
          </span>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {previewMode ? (
            <div
              className="mb-4 rounded-lg border border-amber-500/35 bg-amber-50/90 px-4 py-3 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
              role="status"
            >
              <p className="text-center text-sm text-foreground whitespace-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="font-semibold">Welcome, {user.name}</span>
                <span aria-hidden className="mx-2 text-muted-foreground">
                  ·
                </span>
                <span className="font-normal text-muted-foreground">{user.email}</span>
              </p>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
