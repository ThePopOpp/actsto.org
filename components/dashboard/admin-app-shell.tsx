"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  CreditCard,
  FileText,
  Images,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Scale,
  Settings,
  Users,
  UserRoundCheck,
} from "lucide-react";

import type { ActSession } from "@/lib/auth/types";
import { DashboardSidebarLogo } from "@/components/dashboard/dashboard-sidebar-logo";
import { DashboardTopBar } from "@/components/dashboard/dashboard-topbar";
import { ShepardFab } from "@/components/dashboard/admin/shepard-fab";
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

const dashboardFont = "font-sans";

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number }>;
type NavLeaf = { href: string; label: string; icon: IconType };
type NavGroup = { label: string; icon: IconType; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const nav: NavEntry[] = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  {
    label: "Fundraising",
    icon: Megaphone,
    children: [
      { href: "/dashboard/admin/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/dashboard/admin/backers", label: "Donors", icon: UserRoundCheck },
      { href: "/dashboard/admin/billing", label: "Payments", icon: CreditCard },
      { href: "/dashboard/admin/invoices", label: "Invoices", icon: Receipt },
    ],
  },
  { href: "/dashboard/admin/users", label: "Users", icon: Users },
  {
    label: "Communications",
    icon: MessageSquare,
    children: [
      { href: "/dashboard/admin/sms", label: "SMS", icon: MessageSquare },
      { href: "/dashboard/admin/messages", label: "Inbox", icon: Mail },
      { href: "/dashboard/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Site Content",
    icon: FileText,
    children: [
      { href: "/dashboard/admin/cms", label: "Pages", icon: FileText },
      { href: "/dashboard/admin/blog-post", label: "Blog Post", icon: Newspaper },
      { href: "/dashboard/admin/marketing", label: "Marketing", icon: Images },
    ],
  },
  { href: "/dashboard/admin/legal", label: "Legal", icon: Scale },
  { href: "/dashboard/admin/credentials", label: "API & credentials", icon: KeyRound },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
];

/** Flattened leaf list — used by the top bar command/search. */
const flatNav = nav.flatMap((entry) => (isGroup(entry) ? entry.children : [entry]));

function NavLinks({
  basePath,
  onNavigate,
  collapsed = false,
  onExpand,
  className,
}: {
  basePath: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onExpand?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const overviewHref = adminHrefForBase("/dashboard/admin", basePath);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const leafActive = (href: string) => {
    const mapped = adminHrefForBase(href, basePath);
    return mapped === overviewHref
      ? pathname === overviewHref
      : pathname === mapped || pathname.startsWith(`${mapped}/`);
  };
  const groupActive = (group: NavGroup) => group.children.some((c) => leafActive(c.href));

  const leafClasses = (active: boolean, indented: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      indented && "gap-2 py-2",
      active
        ? "bg-primary text-primary-foreground shadow-sm dark:bg-white/15 dark:text-white"
        : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white",
    );

  // Collapsed: icon-only rail. Groups become a single icon that re-expands the rail.
  if (collapsed) {
    return (
      <nav className={cn("flex flex-col items-center gap-1", dashboardFont, className)}>
        {nav.map((entry) => {
          if (isGroup(entry)) {
            const active = groupActive(entry);
            const Icon = entry.icon;
            return (
              <button
                key={entry.label}
                type="button"
                title={entry.label}
                aria-label={entry.label}
                onClick={() => {
                  onExpand?.();
                  setOpen((o) => ({ ...o, [entry.label]: true }));
                }}
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-primary text-primary-foreground dark:bg-white/15 dark:text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </button>
            );
          }
          const active = leafActive(entry.href);
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              href={adminHrefForBase(entry.href, basePath)}
              onClick={onNavigate}
              title={entry.label}
              aria-label={entry.label}
              className={cn(
                "flex size-10 items-center justify-center rounded-lg transition-colors",
                active
                  ? "bg-primary text-primary-foreground dark:bg-white/15 dark:text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white",
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className={cn("flex flex-col gap-0.5", dashboardFont, className)}>
      {nav.map((entry) => {
        if (!isGroup(entry)) {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              href={adminHrefForBase(entry.href, basePath)}
              onClick={onNavigate}
              className={leafClasses(leafActive(entry.href), false)}
            >
              <Icon className="size-4 shrink-0 opacity-90" strokeWidth={1.75} />
              {entry.label}
            </Link>
          );
        }

        const Icon = entry.icon;
        const hasActive = groupActive(entry);
        const expanded = open[entry.label] ?? hasActive;
        return (
          <div key={entry.label}>
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [entry.label]: !expanded }))}
              aria-expanded={expanded}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                hasActive
                  ? "text-foreground dark:text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" strokeWidth={1.75} />
              <span className="flex-1 text-left">{entry.label}</span>
              <ChevronDown
                className={cn("size-4 shrink-0 opacity-70 transition-transform", expanded && "rotate-180")}
                strokeWidth={1.75}
              />
            </button>
            {expanded ? (
              <div className="mt-0.5 ml-4 flex flex-col gap-0.5 border-l border-border pl-2 dark:border-white/12">
                {entry.children.map((child) => {
                  const ChildIcon = child.icon;
                  return (
                    <Link
                      key={child.href}
                      href={adminHrefForBase(child.href, basePath)}
                      onClick={onNavigate}
                      className={leafClasses(leafActive(child.href), true)}
                    >
                      <ChildIcon className="size-4 shrink-0 opacity-90" strokeWidth={1.75} />
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

const DEFAULT_ADMIN_BASE = "/dashboard/admin";
const COLLAPSE_KEY = "act-admin-sidebar-collapsed";

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
  const [collapsed, setCollapsed] = useState(false);

  // Restore the persisted collapse preference.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

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
          "sticky top-0 hidden h-dvh min-h-0 shrink-0 flex-col border-r border-border py-6 transition-[width] duration-200 md:flex",
          collapsed ? "w-[68px]" : "w-64",
          /* Light: clean white rail (readable dark links + logo). Dark: brand navy. */
          "bg-card text-foreground",
          "dark:border-white/10 dark:bg-[var(--act-brand-navy-dark)] dark:text-white",
        )}
      >
        <div className={cn("flex shrink-0 items-center", collapsed ? "justify-center px-2" : "justify-between px-4")}>
          {collapsed ? null : <DashboardSidebarLogo variant="admin" />}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
        <Separator className="my-4 bg-border dark:bg-white/15" />
        <NavLinks
          basePath={basePath}
          collapsed={collapsed}
          onExpand={() => {
            setCollapsed(false);
            localStorage.setItem(COLLAPSE_KEY, "0");
          }}
          className={cn("min-h-0 flex-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}
        />
        <Separator className="my-4 bg-border dark:bg-white/15" />
        <div
          className={cn(
            "mt-auto text-xs text-muted-foreground dark:text-white/75",
            collapsed ? "flex flex-col items-center gap-3 px-2" : "space-y-3 px-4",
          )}
        >
          {collapsed ? (
            <>
              <ModeToggle />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="dark:border-white/30 dark:text-white dark:hover:bg-white/10"
                onClick={() => void signOut()}
                title={previewMode ? "Exit preview" : "Sign out"}
                aria-label={previewMode ? "Exit preview" : "Sign out"}
              >
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground dark:text-white/80">Theme</span>
                <ModeToggle />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full dark:border-white/30 dark:text-white dark:hover:bg-white/10"
                onClick={() => void signOut()}
              >
                {previewMode ? "Exit preview" : "Sign out"}
              </Button>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background",
              )}
            >
              <Menu className="size-4" />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-border bg-card p-0 text-foreground dark:border-white/10 dark:bg-[var(--act-brand-navy-dark)] dark:text-white"
            >
              <SheetHeader className="border-b border-border p-4 text-left dark:border-white/10">
                <SheetTitle className="sr-only">Admin menu</SheetTitle>
                <DashboardSidebarLogo variant="admin" />
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col p-3">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <NavLinks basePath={basePath} onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="mt-auto space-y-3 border-t border-border pt-4 text-xs dark:border-white/15">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground dark:text-white/80">Theme</span>
                    <ModeToggle />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full dark:border-white/30 dark:text-white dark:hover:bg-white/10"
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

        <DashboardTopBar
          roleLabel="Super Admin"
          basePath={basePath}
          navItems={flatNav}
          user={{ name: user.name, email: user.email }}
          notificationsHref={adminHrefForBase("/dashboard/admin/notifications", basePath)}
          searchPlaceholder="Search campaigns, users, donors…"
        />

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
      {!previewMode ? <ShepardFab /> : null}
    </div>
  );
}
