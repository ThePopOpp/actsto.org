import { Card, CardContent } from "@/components/ui/card";

/**
 * "Reporting income, explained" — a quick reference for what goes where.
 *
 * Native `<details>` rather than a JS accordion: it works without hydration, is
 * keyboard-navigable for free, and is findable by browser in-page search, which
 * matters when a parent is hunting for the word "disability".
 */

const ENTRIES: { question: string; answer: React.ReactNode }[] = [
  {
    question: "Whose names belong on the list?",
    answer:
      "Everyone living in your household — adults and children alike. A person with no income still needs a row; leave their amounts at zero.",
  },
  {
    question: 'What does "gross income" mean?',
    answer: (
      <>
        The <strong>Employment</strong> field is for gross pay: wages, salary, tips, and commissions{" "}
        <strong>before</strong> taxes and deductions, the figure on the pay stub. If you&apos;re
        self-employed, report income after business expenses.
      </>
    ),
  },
  {
    question: "Where do child support and welfare go?",
    answer: (
      <>
        Use <strong>Support</strong> for child support, spousal maintenance, and cash assistance such
        as TANF or general relief. Food assistance benefits are <strong>not</strong> counted as
        income.
      </>
    ),
  },
  {
    question: "What about retirement and disability?",
    answer: (
      <>
        Put pensions, Social Security, Supplemental Security Income, veterans&apos; benefits, and
        disability payments in <strong>Retirement</strong>.
      </>
    ),
  },
  {
    question: 'What counts as "other" income?',
    answer: (
      <>
        <strong>Other</strong> covers unemployment, workers&apos; compensation, net rental income,
        interest, dividends, royalties, and regular gifts from people outside your household.
        Active-duty families can leave out combat pay.
      </>
    ),
  },
];

export function IncomeReportingGuide() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-xl font-semibold text-primary">
          Reporting income, explained
        </h2>
        <p className="text-sm text-muted-foreground">A quick reference for what goes where.</p>
      </div>

      <Card className="border-border/80 p-0">
        <CardContent className="p-0">
          {ENTRIES.map((entry, index) => (
            <details
              key={entry.question}
              className={index < ENTRIES.length - 1 ? "border-b border-border" : undefined}
            >
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-foreground transition-colors marker:content-none hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                {entry.question}
              </summary>
              <div className="px-5 pb-4 text-sm text-muted-foreground">{entry.answer}</div>
            </details>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
