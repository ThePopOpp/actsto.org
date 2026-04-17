"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Heart,
  HeartHandshake,
  HelpCircle,
  LogIn,
  Mail,
  Menu,
  Newspaper,
  Phone,
  Search,
  Shield,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { HeaderUserMenu } from "@/components/header-user-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { ACT_LOGO_FULL } from "@/lib/constants";
import type { ActSession } from "@/lib/auth/types";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

function HeaderCampaignSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) {
      router.push("/campaigns");
      return;
    }
    router.push(`/campaigns?q=${encodeURIComponent(q)}`);
  }

  return (
    <form
      onSubmit={submit}
      className="relative hidden min-w-0 sm:block sm:min-w-[160px] md:min-w-[200px]"
    >
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search campaigns..."
        className="h-9 rounded-full pl-9"
        aria-label="Search campaigns"
        name="q"
        autoComplete="off"
      />
    </form>
  );
}

type MegaItem = {
  href: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
  iconWrapClass?: string;
  iconClass?: string;
  descClass?: string;
};

const megaLearn: MegaItem[] = [
  {
    href: "/how-it-works",
    title: "How It Works",
    desc: "Learn about our platform.",
    Icon: BookOpen,
    iconWrapClass: "bg-slate-100 dark:bg-slate-800",
    iconClass: "text-primary",
  },
  {
    href: "/about-us",
    title: "About Us",
    desc: "Our mission & story.",
    Icon: Heart,
    iconWrapClass: "bg-slate-100 dark:bg-slate-800",
    iconClass: "text-primary",
  },
  {
    href: "/team",
    title: "Our Team",
    desc: "Meet the ACT team.",
    Icon: Users,
    iconWrapClass: "bg-slate-100 dark:bg-slate-800",
    iconClass: "text-primary",
  },
  {
    href: "/faq",
    title: "FAQ",
    desc: "Common questions.",
    Icon: HelpCircle,
    iconWrapClass: "bg-slate-100 dark:bg-slate-800",
    iconClass: "text-primary",
  },
];

const megaSupport: MegaItem[] = [
  {
    href: "/contact",
    title: "Contact Us",
    desc: "Get in touch.",
    Icon: FileText,
    iconWrapClass: "bg-slate-100 dark:bg-slate-800",
    iconClass: "text-primary",
  },
  {
    href: "tel:+14809999906",
    title: "ACT Support",
    desc: "(480) 999-9906",
    Icon: Phone,
    iconWrapClass: "bg-emerald-100 dark:bg-emerald-950/50",
    iconClass: "text-emerald-800 dark:text-emerald-400",
    descClass: "font-medium text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "mailto:support@actsto.org",
    title: "Email Us",
    desc: "support@actsto.org",
    Icon: Mail,
    iconWrapClass: "bg-sky-100 dark:bg-sky-950/50",
    iconClass: "text-sky-800 dark:text-sky-400",
    descClass: "font-medium text-sky-600 dark:text-sky-400",
  },
  {
    href: "/blog",
    title: "Blog",
    desc: "Articles & updates from ACT.",
    Icon: Newspaper,
    iconWrapClass: "bg-slate-100 dark:bg-slate-800",
    iconClass: "text-primary",
  },
];

const megaQuick: MegaItem[] = [
  {
    href: "/register",
    title: "Sign Up",
    desc: "Create an account.",
    Icon: UserPlus,
    iconWrapClass: "bg-slate-100 dark:bg-slate-800",
    iconClass: "text-primary",
  },
  {
    href: "/login",
    title: "Login",
    desc: "Access your account.",
    Icon: LogIn,
    iconWrapClass: "bg-slate-100 dark:bg-slate-800",
    iconClass: "text-primary",
  },
  {
    href: "/campaigns/new",
    title: "Create Campaign",
    desc: "Start a new campaign.",
    Icon: Shield,
    iconWrapClass: "bg-red-100 dark:bg-red-950/40",
    iconClass: "text-red-800 dark:text-red-400",
  },
  {
    href: "/campaigns",
    title: "Support Campaign",
    desc: "Donate to active campaigns.",
    Icon: HeartHandshake,
    iconWrapClass: "bg-red-100 dark:bg-red-950/40",
    iconClass: "text-red-800 dark:text-red-400",
  },
];

const allMobileLinks = [
  { section: "Learn & Info", items: megaLearn },
  { section: "Support & Contact", items: megaSupport },
  { section: "Quick Actions", items: megaQuick },
];

function NavText({
  href,
  children,
  accent,
}: {
  href: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
        accent || active ? "text-act-nav-accent" : "text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function MegaColumn({ title, items }: { title: string; items: MegaItem[] }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wide text-primary uppercase">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const { Icon, iconWrapClass, iconClass, descClass } = item;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    iconWrapClass ?? "bg-muted"
                  )}
                >
                  <Icon
                    className={cn("size-5", iconClass ?? "text-foreground")}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block text-sm font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs leading-snug text-muted-foreground",
                      descClass
                    )}
                  >
                    {item.desc}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MobileMenu({ user, onClose }: { user: ActSession | null; onClose: () => void }) {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const router = useRouter();
  const [search, setSearch] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    onClose();
    router.push(q ? `/campaigns?q=${encodeURIComponent(q)}` : "/campaigns");
  }

  return (
    <div className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-background shadow-lg lg:hidden">
      <div className="px-4 py-4 space-y-1">
        {/* Search */}
        <form onSubmit={submitSearch} className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="h-10 rounded-full pl-9"
            aria-label="Search campaigns"
          />
        </form>

        {/* Home */}
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Home
        </Link>

        {/* Campaigns */}
        <Link
          href="/campaigns"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Campaigns
        </Link>

        {/* Contact */}
        <Link
          href="/contact"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Contact
        </Link>

        {/* Resources accordion */}
        <button
          onClick={() => setResourcesOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Resources
          {resourcesOpen ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </button>

        {resourcesOpen && (
          <div className="ml-3 space-y-4 border-l border-border pl-3 pt-1 pb-2">
            {allMobileLinks.map(({ section, items }) => (
              <div key={section}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  {section}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-md",
                            item.iconWrapClass ?? "bg-muted"
                          )}
                        >
                          <item.Icon
                            className={cn("size-4", item.iconClass ?? "text-foreground")}
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        </span>
                        <span>
                          <span className="block font-medium">{item.title}</span>
                          <span
                            className={cn(
                              "block text-xs text-muted-foreground",
                              item.descClass
                            )}
                          >
                            {item.desc}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* CTA buttons */}
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          {user ? (
            <Link
              href="/dashboard"
              onClick={onClose}
              className={cn(buttonVariants({ size: "sm" }), "justify-center")}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                onClick={onClose}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-center")}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className={cn(buttonVariants({ size: "sm" }), "justify-center")}
              >
                Get Started
              </Link>
              <Link
                href="/campaigns/new"
                onClick={onClose}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-center")}
              >
                Start Campaign
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({ user }: { user: ActSession | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 shadow-sm backdrop-blur-md">
      <div className="relative mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="relative block h-10 w-[200px] shrink-0 sm:h-11 sm:w-[220px]">
          <Image
            src={ACT_LOGO_FULL}
            alt="Arizona Christian Tuition"
            fill
            className="object-contain object-left"
            priority
            sizes="220px"
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          <NavText href="/" accent>
            Home
          </NavText>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-act-nav-accent">
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-0">
                  <div className="grid w-[min(100vw-2rem,56rem)] grid-cols-1 gap-8 p-6 md:grid-cols-3 md:gap-6">
                    <MegaColumn title="Learn & Info" items={megaLearn} />
                    <MegaColumn title="Support & Actions" items={megaSupport} />
                    <MegaColumn title="Quick Actions" items={megaQuick} />
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <NavText href="/campaigns">Campaigns</NavText>
          <NavText href="/contact" accent>
            Contact
          </NavText>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ModeToggle />
          <HeaderCampaignSearch />
          {!user && (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden sm:inline-flex"
              )}
            >
              Sign In
            </Link>
          )}
          <Link
            href="/campaigns/new"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden sm:inline-flex"
            )}
          >
            Start Campaign
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
          >
            Get Started
          </Link>
          {user ? (
            <HeaderUserMenu session={user} />
          ) : (
            <Link
              href="/login"
              className="hidden size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex lg:hidden"
              aria-label="Account / sign in"
            >
              <User className="size-4" aria-hidden />
            </Link>
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground transition-colors hover:bg-muted lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <MobileMenu user={user} onClose={() => setMobileOpen(false)} />
      )}
    </header>
  );
}
