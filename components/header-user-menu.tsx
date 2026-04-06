"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";

import { ROLE_LABEL, type ActSession } from "@/lib/auth/types";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function menuIconWrap(children: React.ReactNode) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center text-foreground">
      {children}
    </span>
  );
}

function MenuRow({
  href,
  icon,
  children,
  className,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        className
      )}
    >
      {menuIconWrap(icon)}
      {children}
    </Link>
  );
}

function notificationsHref(role: ActSession["role"]) {
  if (role === "super_admin") return "/dashboard/admin/notifications";
  return dashboardPathForRole(role);
}

function settingsHref(role: ActSession["role"]) {
  if (role === "super_admin") return "/dashboard/admin/settings";
  return dashboardPathForRole(role);
}

export function HeaderUserMenu({ session }: { session: ActSession }) {
  const dash = dashboardPathForRole(session.role);
  const displayName = session.name.trim() || session.email.split("@")[0] || "Account";

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-9 max-w-[200px] items-center gap-2 rounded-full border border-border bg-background pl-1 pr-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        )}
      >
        <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
          <span aria-hidden>{initials(session.name || session.email)}</span>
        </span>
        <span className="min-w-0 truncate">{displayName}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={8} className="w-[min(calc(100vw-2rem),20rem)] p-0">
        <div className="p-3">
          <p className="truncate font-semibold text-foreground">{session.name || displayName}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[session.role]}</p>
          <p className="truncate text-xs text-muted-foreground">{session.email}</p>
        </div>
        <Separator />
        <nav className="flex flex-col p-1.5" aria-label="Account menu">
          <MenuRow href="/dashboard/profile" icon={<User className="size-4" strokeWidth={1.5} />}>
            My Profile
          </MenuRow>
          <MenuRow href={dash} icon={<LayoutDashboard className="size-4" strokeWidth={1.5} />}>
            Dashboard
          </MenuRow>
          <MenuRow href="/campaigns" icon={<Megaphone className="size-4" strokeWidth={1.5} />}>
            Campaigns
          </MenuRow>
          <MenuRow href="/dashboard/backers" icon={<Users className="size-4" strokeWidth={1.5} />}>
            Backers
          </MenuRow>
          <MenuRow
            href={notificationsHref(session.role)}
            icon={<Bell className="size-4" strokeWidth={1.5} />}
          >
            Notifications
          </MenuRow>
          <MenuRow href={settingsHref(session.role)} icon={<Settings className="size-4" strokeWidth={1.5} />}>
            Settings
          </MenuRow>
        </nav>
        {session.role === "super_admin" && (
          <>
            <Separator />
            <div className="p-1.5">
              <MenuRow
                href="/dashboard/admin"
                icon={<Shield className="size-4" strokeWidth={1.5} />}
                className="text-destructive hover:text-destructive"
              >
                Super Admin
              </MenuRow>
            </div>
          </>
        )}
        <Separator />
        <div className="p-1.5">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {menuIconWrap(<LogOut className="size-4" strokeWidth={1.5} />)}
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
