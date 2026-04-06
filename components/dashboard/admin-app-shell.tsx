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
  Shield,
  Users,
} from "lucide-react";

import type { ActSession } from "@/lib/auth/types";
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
    <nav className={cn("flex flex-col gap-0.5", className)}>
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
    <div className="flex min-h-[calc(100dvh-0px)] bg-muted/30">
      <aside
        className={cn(
          "hidden w-64 shrink-0 flex-col border-r border-border py-6 md:flex",
          /* Light: navy primary. Dark: shadcn inverts --primary to near-white — keep brand navy for this shell. */
          "bg-primary text-primary-foreground",
          "dark:border-white/10 dark:bg-[var(--act-brand-navy-dark)] dark:text-white"
        )}
      >
        <div className="flex items-center gap-2 px-4">
          <Shield className="size-8 shrink-0 text-primary-foreground dark:text-white" strokeWidth={1.5} />
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary-foreground/70 uppercase dark:text-white/70">
              Super Admin
            </p>
            <p className="text-sm font-semibold leading-tight text-primary-foreground dark:text-white">
              ACT Control
            </p>
          </div>
        </div>
        <Separator className="my-4 bg-primary-foreground/15 dark:bg-white/15" />
        <NavLinks basePath={basePath} className="flex-1 overflow-y-auto px-3" />
        <Separator className="my-4 bg-primary-foreground/15 dark:bg-white/15" />
        <div className="space-y-3 px-4 text-xs text-primary-foreground/75 dark:text-white/75">
          <p className="truncate font-medium text-primary-foreground dark:text-white">{user.name}</p>
          <p className="truncate dark:text-white/80">{user.email}</p>
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
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
                <SheetTitle className="font-heading text-primary-foreground dark:text-white">Admin menu</SheetTitle>
              </SheetHeader>
              <div className="flex h-[calc(100dvh-5rem)] flex-col p-3">
                <NavLinks basePath={basePath} onNavigate={() => setMobileOpen(false)} />
                <div className="mt-auto border-t border-primary-foreground/15 pt-4 text-xs dark:border-white/15">
                  <p className="font-medium dark:text-white">{user.email}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full border-primary-foreground/30 bg-transparent text-primary-foreground dark:border-white/30 dark:text-white dark:hover:bg-white/10"
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {previewMode ? (
            <div
              className="mb-4 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-center text-xs font-medium text-amber-950 dark:text-amber-100"
              role="status"
            >
              UI preview — not signed in. Available in development, or set{" "}
              <code className="rounded bg-background/60 px-1">ADMIN_UI_PREVIEW=true</code> for
              non-dev environments.
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
