"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const individualPoints: { label: string; text: string }[] = [
  {
    label: "Impact on Students",
    text: "STOs provide scholarships to students attending private Christian schools, enabling them to attend private schools that might otherwise be unaffordable.",
  },
  {
    label: "Dual Benefit",
    text: "Donations to STOs offer a win-win situation: donors receive a tax credit, and students receive educational opportunities.",
  },
  {
    label: "Easy Process",
    text: "Donating to an STO is simple and can be done through various methods, including online, mail, or phone.",
  },
  {
    label: "Employer Matching",
    text: "Many companies offer to match employee donations to charitable organizations, including STOs.",
  },
  {
    label: "Deadline",
    text: "While you can donate any time of year, donations made between January 1st and April 15th can be designated to apply to either the previous or current tax year.",
  },
  {
    label: "Supporting School Choice",
    text: "Donating to an STO supports the principle of school choice, allowing parents to choose the educational environment that best suits their child’s needs.",
  },
  {
    label: "Beyond Tax Liability",
    text: "Donors can give beyond their tax liability, and these additional donations may be deductible on their federal tax returns as well as available for future use within the next 5 tax years.",
  },
  {
    label: "Transparency and Accountability",
    text: "STOs are certified by the Arizona Department of Revenue (ADOR) and must meet strict requirements, ensuring transparency and accountability in how donations are used.",
  },
  {
    label: "Student Designation",
    text: "Donors can recommend students, but it is never a guarantee that the student specified will receive the full amount donated.",
  },
  {
    label: "Consult a Professional",
    text: "Donors should consult with a tax advisor or CPA to understand the full tax implications of their donation.",
  },
];

type CorpBlock = {
  title: string;
  bullets: { lead: string; text: string }[];
};

const corporateBlocks: CorpBlock[] = [
  {
    title: "Zero net cost to the business",
    bullets: [
      {
        lead: "Redirect, don’t donate",
        text: "Corporations can redirect up to 100% of their Arizona corporate income or insurance premium tax liability to a qualified STO, receiving a dollar-for-dollar tax credit.",
      },
      {
        lead: "No extra funds required",
        text: "This is not a new expenditure, but rather a redirection of taxes already owed to the state, effectively costing the corporation nothing extra.",
      },
    ],
  },
  {
    title: "Impact on Arizona’s students and schools",
    bullets: [
      {
        lead: "Scholarship funding",
        text: "Corporate donations directly fund scholarships for students, particularly those from low-income families, disabled, or displaced students, attending K–12 private schools in Arizona.",
      },
      {
        lead: "Increased educational opportunities",
        text: "The program allows families who may not otherwise be able to afford private school tuition to provide their children with a quality education of their choice.",
      },
      {
        lead: "Supports school choice",
        text: "By participating, corporations actively support educational choice and empower families to select the best learning environment for their children.",
      },
    ],
  },
  {
    title: "Benefits for the business",
    bullets: [
      {
        lead: "Corporate social responsibility",
        text: "Participating in the program demonstrates a company’s commitment to the local community and can enhance its social responsibility profile.",
      },
      {
        lead: "Potential public relations benefits",
        text: "Companies can choose to be publicly recognized for their contributions and their positive impact on education.",
      },
      {
        lead: "Carryforward of unused credits",
        text: "Any unused tax credit amounts may be carried forward for up to 5 years.",
      },
      {
        lead: "Potential federal tax deduction",
        text: "Depending on the business’s tax situation, the donation might also qualify for a federal income tax deduction as STOs are 501(c)(3) nonprofit organizations.",
      },
    ],
  },
  {
    title: "Program details and process",
    bullets: [
      {
        lead: "Minimum and maximums",
        text: "S-corporations and LLCs filing as S-corps have a minimum donation of $5,000, while C-corporations and insurance companies have no minimum.",
      },
      {
        lead: "Eligible corporations",
        text: "Corporate STO credits are available only to corporate taxpayers, exempt organizations with unrelated business income, corporate partners of a partnership (if passed through by a partnership), or an S corporation (may be passed through to their individual shareholders).",
      },
      {
        lead: "Annual statewide cap",
        text: "The annual statewide cap for corporate donations to the STO program, allocated on a first-come, first-served basis, opens in July.",
      },
      {
        lead: "Pre-approval required",
        text: "Companies need to contact an STO to apply for pre-approval of their donation request from the Arizona Department of Revenue (ADOR).",
      },
      {
        lead: "School recommendations allowed",
        text: "While corporations cannot designate a specific student, they can recommend a specific school or multiple schools to benefit from their contribution.",
      },
    ],
  },
  {
    title: "Easy to participate",
    bullets: [
      {
        lead: "Contact an STO",
        text: "Companies interested in participating can easily connect with an STO like Arizona Christian Tuition to get started.",
      },
    ],
  },
];

export function TaxCreditsTabs() {
  const [tab, setTab] = useState<"individual" | "corporate">("individual");

  return (
    <section className="bg-background py-14 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl font-semibold text-primary sm:text-4xl">Tax Credits</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Learn why individuals and businesses participate in Arizona&apos;s tuition tax credit programs.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-2">
          <button
            type="button"
            onClick={() => setTab("individual")}
            className={cn(
              "rounded-lg px-6 py-3 text-sm font-semibold transition-colors",
              tab === "individual"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-primary bg-background text-primary hover:bg-muted/50"
            )}
          >
            Individual Tax Credit
          </button>
          <button
            type="button"
            onClick={() => setTab("corporate")}
            className={cn(
              "rounded-lg px-6 py-3 text-sm font-semibold transition-colors",
              tab === "corporate"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-primary bg-background text-primary hover:bg-muted/50"
            )}
          >
            Corporate Tax Credit
          </button>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-4xl px-4 sm:px-6 lg:px-8">
        <Card className="border-border/80 shadow-sm ring-1 ring-foreground/5">
          <CardContent className="p-6 sm:p-8">
            {tab === "individual" ? (
              <div className="text-left">
                <h3 className="font-heading text-xl font-semibold text-primary sm:text-2xl">
                  Individual Tax Credit
                </h3>
                <ul className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
                  {individualPoints.map((item) => (
                    <li key={item.label}>
                      <span className="font-semibold text-foreground">{item.label}:</span> {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-left">
                <h3 className="font-heading text-xl font-semibold text-primary sm:text-2xl">
                  Corporate Tax Credit
                </h3>
                <div className="mt-8 space-y-10">
                  {corporateBlocks.map((block, idx) => (
                    <div key={block.title}>
                      <p className="text-sm font-semibold text-act-red">
                        {idx + 1}. {block.title}
                      </p>
                      <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                        {block.bullets.map((b) => (
                          <li key={b.lead}>
                            <span className="font-semibold text-foreground">{b.lead}:</span> {b.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <p className="text-sm font-semibold text-foreground">
                    STO assistance:{" "}
                    <span className="font-normal text-muted-foreground">
                      STOs provide support and guidance throughout the process, from application to
                      receiving the tax credit.
                    </span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
