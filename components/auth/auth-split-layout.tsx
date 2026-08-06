import Image from "next/image";
import Link from "next/link";

import { ACT_LOGO_DARK, ACT_LOGO_LIGHT } from "@/lib/constants";

/**
 * Shared layout for sign-in, forgot-password and reset-password: form on the
 * left, brand panel on the right.
 *
 * The panel is decorative and hidden below `lg`, so mobile keeps the plain
 * single-column form. Nothing functional lives in it — no links, no controls,
 * so nothing is lost when it isn't rendered.
 */
export function AuthSplitLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-5 py-14 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-block">
            <Image
              src={ACT_LOGO_LIGHT}
              alt="ACTSTO.org"
              width={148}
              height={38}
              className="h-9 w-auto dark:hidden"
              priority
            />
            <Image
              src={ACT_LOGO_DARK}
              alt="ACTSTO.org"
              width={148}
              height={38}
              className="hidden h-9 w-auto dark:block"
              priority
            />
          </Link>

          <h1 className="font-heading text-3xl font-semibold text-primary">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </div>

      <AuthBrandPanel />
    </div>
  );
}

function AuthBrandPanel() {
  return (
    <aside
      aria-hidden
      className="relative hidden flex-col justify-between overflow-hidden bg-[var(--act-brand-navy-dark)] p-12 text-white lg:flex"
    >
      {/* Warmth in the corners so the panel doesn't read as a flat navy block. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(120% 90% at 85% 0%, rgba(255,255,255,0.10) 0%, transparent 55%), radial-gradient(90% 70% at 0% 100%, rgba(178,30,42,0.22) 0%, transparent 60%)",
        }}
      />

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
          <span className="size-1.5 rounded-full bg-act-red" />
          Arizona Christian Tuition
        </span>
      </div>

      <div className="relative max-w-lg">
        <blockquote className="font-heading text-3xl leading-tight font-semibold xl:text-4xl">
          &ldquo;Founded by Arizona dads who believed every family deserves access to private
          Christian education.&rdquo;
        </blockquote>
        <p className="mt-6 text-sm font-medium">
          Turning Arizona tax liability into tuition scholarships
        </p>
        <p className="mt-1 text-sm text-white/60">Serving families across Arizona</p>
      </div>

      {/* Facts that hold up: both are stated elsewhere on the site. Swap in real
          numbers (families served, scholarships awarded) once they're confirmed. */}
      <div className="relative grid grid-cols-3 gap-6 border-t border-white/15 pt-8">
        <Stat label="501(c)(3)" detail="Nonprofit organization" />
        <Stat label="A.R.S. § 43-1089" detail="Arizona tax credit" />
        <Stat label="Dollar for dollar" detail="Credit, not a deduction" />
      </div>
    </aside>
  );
}

function Stat({ label, detail }: { label: string; detail: string }) {
  return (
    <div>
      <p className="font-heading text-base font-semibold">{label}</p>
      <p className="mt-0.5 text-xs text-white/60">{detail}</p>
    </div>
  );
}
