"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronRight, Search } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";
import { Input } from "@/components/ui/input";
import { adminHrefForBase } from "@/lib/dashboard/admin-base-path";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

function initialsFrom(name: string, email: string) {
  const base = (name || "").trim();
  if (base) {
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  }
  return (email || "?").slice(0, 2).toUpperCase();
}

export function DashboardTopBar({
  roleLabel,
  basePath,
  navItems,
  user,
  notificationsHref,
  searchPlaceholder = "Search campaigns, users, donors…",
  searchBasePath,
  className,
}: {
  roleLabel: string;
  basePath: string;
  navItems: readonly NavItem[];
  user: { name: string; email: string; avatarUrl?: string | null };
  notificationsHref: string;
  searchPlaceholder?: string;
  /** Where the search box routes to (defaults to the campaigns list under basePath). */
  searchBasePath?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [unread, setUnread] = useState(0);

  // Resolve the current section label from the deepest matching nav item.
  const section = useMemo(() => {
    let best = { label: "Dashboard", len: -1 };
    for (const item of navItems) {
      const mapped = adminHrefForBase(item.href, basePath);
      if (pathname === mapped || pathname.startsWith(`${mapped}/`)) {
        if (mapped.length > best.len) best = { label: item.label, len: mapped.length };
      }
    }
    return best.label;
  }, [pathname, navItems, basePath]);

  useEffect(() => {
    let active = true;
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { notifications?: Array<{ readAt?: string | null }> }) => {
        if (!active) return;
        setUnread((d?.notifications ?? []).filter((n) => !n.readAt).length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    const target = (searchBasePath ?? `${basePath.replace(/\/$/, "")}/campaigns`).replace(/\/$/, "");
    router.push(term ? `${target}?q=${encodeURIComponent(term)}` : target);
  }

  const initials = initialsFrom(user.name, user.email);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 hidden h-16 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur md:flex lg:px-6",
        className,
      )}
    >
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link href={adminHrefForBase(navItems[0]?.href ?? basePath, basePath)} className="shrink-0 text-muted-foreground hover:text-foreground">
          {roleLabel}
        </Link>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
        <span className="truncate font-medium text-foreground">{section}</span>
      </nav>

      <div className="ml-auto flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
        <form onSubmit={submitSearch} className="relative hidden w-full max-w-sm lg:block xl:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search"
            className="h-9 rounded-lg pl-9"
          />
        </form>

        <Link
          href={notificationsHref}
          aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
          className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-[18px]" aria-hidden />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-act-red px-1 text-[10px] leading-none font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Link>

        <ModeToggle />

        <div className="ml-1 flex shrink-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <span className="hidden max-w-[180px] truncate text-sm text-muted-foreground xl:block">
            {user.email}
          </span>
        </div>
      </div>
    </header>
  );
}
