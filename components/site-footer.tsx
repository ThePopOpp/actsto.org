import Image from "next/image";
import Link from "next/link";

import { ACT_LOGO_FULL } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Footer sits on brand navy; dark theme’s `primary-foreground` can be wrong — keep links explicitly light. */
const footerLinkClass =
  "text-primary-foreground/90 underline-offset-4 transition-colors hover:text-white hover:underline dark:text-white/95 dark:hover:text-sky-200 dark:hover:underline";

const explore = [
  { href: "/campaigns", label: "Campaigns" },
  { href: "/#featured-campaigns", label: "Featured Campaigns" },
  { href: "/campaigns?filter=ending-soon", label: "Ending Soon" },
  { href: "/campaigns?filter=almost-funded", label: "Most Funded" },
  { href: "/register", label: "Get Started" },
];

const discover = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about-us", label: "About Us" },
  { href: "/team", label: "Our Team" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact Us" },
];

const myAccount = [
  { href: "/register", label: "Get Started" },
  {
    href: "/login?role=parent&next=/dashboard/parent",
    label: "Parent Portal",
  },
  {
    href: "/login?role=student&next=/dashboard/student",
    label: "Student Portal",
  },
  {
    href: "/login?role=donor_individual&next=/dashboard/donor",
    label: "Donor Portal",
  },
  {
    href: "/login?role=donor_business&next=/dashboard/business",
    label: "Business Portal",
  },
];

const resources = [
  { href: "/register", label: "Register" },
  { href: "/login", label: "Login" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Support" },
  { href: "/legal/terms", label: "Legal" },
];

export function SiteFooter() {
  return (
    <footer
      className={cn(
        "bg-primary text-primary-foreground",
        /* Match dark page shell to brand navy */
        "dark:bg-[var(--act-brand-navy-dark)] dark:text-[oklch(0.98_0.01_240)]"
      )}
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
          <div className="shrink-0 lg:max-w-[280px]">
            <Link href="/" className="relative block h-12 w-[220px]">
              <Image
                src={ACT_LOGO_FULL}
                alt="Arizona Christian Tuition"
                fill
                className="object-contain object-left"
                sizes="220px"
              />
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/80 dark:text-white/85">
              Arizona Christian Tuition is a certified School Tuition Organization (STO) under
              Arizona law, helping families access Christian education through tax credit
              scholarships.
            </p>
            <div className="mt-4 inline-flex rounded-full bg-primary-foreground/10 px-4 py-2 text-xs text-sky-200">
              Singles up to $1,459 · Married up to $2,918 tax credit
            </div>
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-primary-foreground dark:text-white">
                Explore
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                {explore.map((item) => (
                  <li key={`${item.href}-${item.label}`}>
                    <Link href={item.href} className={footerLinkClass}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-primary-foreground dark:text-white">
                Discover
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                {discover.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={footerLinkClass}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-primary-foreground dark:text-white">
                My Account
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                {myAccount.map((item) => (
                  <li key={`${item.href}-${item.label}`}>
                    <Link href={item.href} className={footerLinkClass}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-primary-foreground dark:text-white">
                Resources
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                {resources.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={footerLinkClass}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/15 pt-8 text-xs text-primary-foreground/70 dark:text-white/80 md:flex-row">
          <p className="text-center md:text-left">
            © {new Date().getFullYear()} Arizona Christian Tuition. All rights reserved. · EIN:
            86-XXXXXXX
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/legal/privacy" className={footerLinkClass}>
              Privacy Policy
            </Link>
            <Link href="/legal/communication-policy" className={footerLinkClass}>
              Communication Policy
            </Link>
            <Link href="/legal/terms" className={footerLinkClass}>
              Terms of Service
            </Link>
            <Link href="/legal/terms/tax-disclosure" className={footerLinkClass}>
              Tax Credit Disclosure
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
