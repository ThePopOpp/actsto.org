import type { Metadata } from "next";

import { percentOf, STO_PROGRAMS, type StoProgramFigures, type StoReportingYear } from "@/lib/sto-reporting";
import { getStoReporting } from "@/lib/sto-reporting-server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Scholarship Reporting",
  description:
    "Scholarships awarded by Arizona Christian Tuition by family income, as required by A.R.S. § 43-1503(B)(6) and § 43-1603(B)(5).",
};

export const dynamic = "force-dynamic";

/*
 * One ordinal ramp in the brand navy — darkest marks the figure the statute
 * leads with. Steps validated for CVD separation in light and dark; the lighter
 * steps sit under 3:1 against the surface, so every value is also direct-labelled
 * and in the table below.
 */
const BRACKETS = [
  { id: "upTo185", label: "Up to 185% of poverty level", swatch: "bg-[#2c4ea8] dark:bg-[#6a8bdc]", ink: "text-white dark:text-[#0f234e]" },
  { id: "from185To342", label: "Above 185% to 342.25%", swatch: "bg-[#7f9fe6] dark:bg-[#3657bb]", ink: "text-[#0f234e] dark:text-white" },
  { id: "other", label: "Above 342.25% or not reported", swatch: "bg-slate-300 dark:bg-slate-600", ink: "text-slate-800 dark:text-white" },
] as const;

function usd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function segments(f: StoProgramFigures) {
  const other = Math.max(0, f.totalAwarded - f.upTo185 - f.from185To342);
  return [
    { ...BRACKETS[0], amount: f.upTo185 },
    { ...BRACKETS[1], amount: f.from185To342 },
    { ...BRACKETS[2], amount: other },
  ].map((s) => ({ ...s, pct: percentOf(s.amount, f.totalAwarded) }));
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
      {BRACKETS.map((b) => (
        <li key={b.id} className="flex items-center gap-2">
          <span className={cn("size-3 rounded-sm", b.swatch)} aria-hidden />
          {b.label}
        </li>
      ))}
    </ul>
  );
}

function ProgramBar({ label, figures }: { label: string; figures: StoProgramFigures }) {
  const parts = segments(figures).filter((s) => s.amount > 0);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{usd(figures.totalAwarded)} awarded</span>
      </div>
      {parts.length === 0 ? (
        <div className="h-8 rounded-md border border-dashed border-border" aria-hidden />
      ) : (
        <div className="flex h-8 gap-0.5 overflow-hidden rounded-md" aria-hidden>
          {parts.map((s) => (
            <div
              key={s.id}
              className={cn("flex min-w-1 items-center justify-center text-xs font-semibold tabular-nums", s.swatch, s.ink)}
              style={{ width: `${s.pct}%` }}
              title={`${s.label}: ${usd(s.amount)} (${s.pct}%)`}
            >
              {s.pct >= 12 ? `${s.pct}%` : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function YearReport({ year, headline }: { year: StoReportingYear; headline: boolean }) {
  const offered = STO_PROGRAMS.filter((p) => year.programs[p.key].offered);
  return (
    <section className="space-y-6 rounded-xl border border-border/80 bg-card p-5 sm:p-6">
      <div>
        <h2 className={cn("font-heading font-semibold text-primary", headline ? "text-2xl" : "text-xl")}>
          Fiscal year {year.fiscalYear}
        </h2>
        {year.periodLabel ? <p className="mt-1 text-sm text-muted-foreground">{year.periodLabel}</p> : null}
      </div>

      {offered.length > 0 ? (
        <div className="space-y-5">
          <Legend />
          {offered.map((p) => (
            <ProgramBar key={p.key} label={p.label} figures={year.programs[p.key]} />
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">
            Scholarships awarded in fiscal year {year.fiscalYear} by family income relative to the federal poverty level
          </caption>
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-4">Program</th>
              <th scope="col" className="py-2 pr-4 text-right">Total awarded</th>
              <th scope="col" className="py-2 pr-4 text-right">Up to 185%</th>
              <th scope="col" className="py-2 pr-4 text-right">% of total</th>
              <th scope="col" className="py-2 pr-4 text-right">185% – 342.25%</th>
              <th scope="col" className="py-2 text-right">% of total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {STO_PROGRAMS.map((p) => {
              const f = year.programs[p.key];
              return (
                <tr key={p.key}>
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium text-foreground">
                    {p.label}
                    <span className="block text-xs font-normal text-muted-foreground">{p.statute}</span>
                  </th>
                  {f.offered ? (
                    <>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{usd(f.totalAwarded)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{usd(f.upTo185)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{percentOf(f.upTo185, f.totalAwarded)}%</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{usd(f.from185To342)}</td>
                      <td className="py-2.5 text-right tabular-nums">{percentOf(f.from185To342, f.totalAwarded)}%</td>
                    </>
                  ) : (
                    <td colSpan={5} className="py-2.5 text-right text-muted-foreground">
                      N/A — program not offered this fiscal year
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function ScholarshipReportingPage() {
  const { years } = await getStoReporting();
  const published = years.filter((y) => y.published);
  const [latest, ...earlier] = published;

  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-act-banner/40 to-background dark:from-act-banner/10">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
            Scholarship reporting
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            As required by A.R.S. § 43-1503(B)(6) and § 43-1603(B)(5), Arizona Christian Tuition publishes, for
            each scholarship program, the total dollar amount and percentage of educational scholarships and tuition
            grants awarded during the prior fiscal year to students whose family income is up to 185% of the federal
            poverty level, and to students whose family income is above 185% but not more than 342.25% of the
            poverty level.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        {latest ? (
          <>
            <YearReport year={latest} headline />
            {earlier.length > 0 ? (
              <div className="space-y-6">
                <h2 className="font-heading text-lg font-semibold text-primary">Previous fiscal years</h2>
                {earlier.map((y) => (
                  <YearReport key={y.fiscalYear} year={y} headline={false} />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            Prior fiscal year figures will be posted here.
          </p>
        )}
      </div>
    </>
  );
}
