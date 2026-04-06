"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

function ModalBody({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground max-h-[min(60vh,520px)] space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
      {children}
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-foreground font-semibold">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}

export function HomeTaxCreditInfoModals() {
  return (
    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:mt-12 sm:flex-row sm:gap-4">
      <Dialog>
        <DialogTrigger
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "min-w-[200px] rounded-lg px-6"
          )}
        >
          Individual Tax Credit
        </DialogTrigger>
        <DialogContent
          className="flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
          showCloseButton
        >
          <DialogHeader className="border-border shrink-0 border-b px-4 pt-4 pr-12 pb-3">
            <DialogTitle className="font-heading text-primary text-lg sm:text-xl">
              Individual Tax Credit
            </DialogTitle>
          </DialogHeader>
          <ModalBody>
            <InfoBlock title="Impact on Students">
              STOs provide scholarships to students attending private Christian schools enabling them
              to attend private schools that might otherwise be unaffordable.
            </InfoBlock>
            <InfoBlock title="Dual Benefit">
              Donations to STOs offer a win-win situation: donors receive a tax credit, and students
              receive educational opportunities.
            </InfoBlock>
            <InfoBlock title="Easy Process">
              Donating to an STO is simple and can be done through various methods, including online,
              mail, or phone.
            </InfoBlock>
            <InfoBlock title="Employer Matching">
              Many companies offer to match employee donations to charitable organizations, including
              STOs.
            </InfoBlock>
            <InfoBlock title="Deadline">
              While you can donate any time of year, donations made between January 1st and April 15th
              can be designated to apply to either the previous or current tax year.
            </InfoBlock>
            <InfoBlock title="Supporting School Choice">
              Donating to an STO supports the principle of school choice, allowing parents to choose
              the educational environment that best suits their child&apos;s needs.
            </InfoBlock>
            <InfoBlock title="Beyond Tax Liability">
              Donors can give beyond their tax liability, and these additional donations may be
              deductible on their federal tax returns as well as available for future use within the
              next 5 tax years.
            </InfoBlock>
            <InfoBlock title="Transparency and Accountability">
              STOs are certified by the Arizona Department of Revenue (ADOR) and must meet strict
              requirements, ensuring transparency and accountability in how donations are used.
            </InfoBlock>
            <InfoBlock title="Student Designation">
              Donors can recommend students but it is never a guarantee that the student specified
              will receive the full amount donated.
            </InfoBlock>
            <InfoBlock title="Consult a Professional">
              Donors should consult with a tax advisor or CPA to understand the full tax implications
              of their donation.
            </InfoBlock>
          </ModalBody>
          <DialogFooter className="border-border bg-muted/40 m-0 shrink-0 rounded-none border-t px-4 py-3 sm:justify-center">
            <Link
              href="/register/donor"
              className={cn(buttonVariants({ size: "lg" }), "w-full min-w-[160px] sm:w-auto")}
            >
              Get Started
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "min-w-[200px] rounded-lg px-6"
          )}
        >
          Corporate Tax Credit
        </DialogTrigger>
        <DialogContent
          className="flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
          showCloseButton
        >
          <DialogHeader className="border-border shrink-0 border-b px-4 pt-4 pr-12 pb-3">
            <DialogTitle className="font-heading text-primary text-lg sm:text-xl">
              Corporate Tax Credit
            </DialogTitle>
          </DialogHeader>
          <ModalBody>
            <div>
              <p className="text-foreground font-semibold">1. Zero net cost to the business</p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <span className="text-foreground font-medium">Redirect, don&apos;t donate: </span>
                  Corporations can redirect up to 100% of their Arizona corporate income or insurance
                  premium tax liability to a qualified STO, receiving a dollar-for-dollar tax credit.
                </li>
                <li>
                  <span className="text-foreground font-medium">No extra funds required: </span>
                  This is not a new expenditure, but rather a redirection of taxes already owed to
                  the state, effectively costing the corporation nothing extra.
                </li>
              </ul>
            </div>
            <div>
              <p className="text-foreground font-semibold">2. Impact on Arizona&apos;s students and schools</p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <span className="text-foreground font-medium">Scholarship funding: </span>
                  Corporate donations directly fund scholarships for students, particularly those
                  from low-income families, disabled, or displaced students, attending K-12 private
                  schools in Arizona.
                </li>
                <li>
                  <span className="text-foreground font-medium">Increased educational opportunities: </span>
                  The program allows families who may not otherwise be able to afford private school
                  tuition to provide their children with a quality education of their choice.
                </li>
                <li>
                  <span className="text-foreground font-medium">Supports school choice: </span>
                  By participating, corporations actively support educational choice and empower
                  families to select the best learning environment for their children.
                </li>
              </ul>
            </div>
            <div>
              <p className="text-foreground font-semibold">3. Benefits for the business</p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <span className="text-foreground font-medium">Corporate social responsibility: </span>
                  Participating in the program demonstrates a company&apos;s commitment to the local
                  community and can enhance its social responsibility profile.
                </li>
                <li>
                  <span className="text-foreground font-medium">Potential public relations benefits: </span>
                  Companies can choose to be publicly recognized for their contributions and their
                  positive impact on education.
                </li>
                <li>
                  <span className="text-foreground font-medium">Carryforward of unused credits: </span>
                  Any unused tax credit amounts may be carried forward for up to 5 years.
                </li>
                <li>
                  <span className="text-foreground font-medium">Potential federal tax deduction: </span>
                  Depending on the business&apos;s tax situation, the donation might also qualify for
                  a federal income tax deduction as STOs are 501(c)(3) nonprofit organizations.
                </li>
              </ul>
            </div>
            <div>
              <p className="text-foreground font-semibold">4. Program details and process</p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <span className="text-foreground font-medium">Minimum and maximums: </span>
                  S-corporations and LLCs filing as S-corps have a minimum donation of $5,000,
                  while C-corporations and insurance companies have no minimum.
                </li>
                <li>
                  <span className="text-foreground font-medium">Eligible Corporations: </span>
                  Corporate STO credits are available only to corporate taxpayers, exempt organizations
                  with unrelated business income, corporate partners of a partnership (if passed
                  through by a partnership), or an S corporation (may be passed through to their
                  individual shareholders).
                </li>
                <li>
                  <span className="text-foreground font-medium">Annual statewide cap: </span>
                  The annual statewide cap for corporate donations to the STO program, allocated on a
                  first-come, first-served basis, opens in July.
                </li>
                <li>
                  <span className="text-foreground font-medium">Pre-approval required: </span>
                  Companies need to contact an STO to apply for pre-approval of their donation request
                  from the Arizona Department of Revenue (ADOR).
                </li>
                <li>
                  <span className="text-foreground font-medium">School recommendations allowed: </span>
                  While corporations cannot designate a specific student, they can recommend a
                  specific school or multiple schools to benefit from their contribution.
                </li>
              </ul>
            </div>
            <div>
              <p className="text-foreground font-semibold">5. Easy to participate</p>
              <p className="mt-2">
                <span className="text-foreground font-medium">Contact an STO: </span>
                Companies interested in participating can easily connect with an STO like Arizona
                Christian Tuition to get started.
              </p>
            </div>
            <div className="border-border bg-muted/30 rounded-lg border p-3">
              <p className="text-foreground font-semibold">Note</p>
              <p className="mt-1">
                <span className="text-foreground font-medium">STO assistance: </span>
                STOs provide support and guidance throughout the process, from application to
                receiving the tax credit.
              </p>
            </div>
          </ModalBody>
          <DialogFooter className="border-border bg-muted/40 m-0 shrink-0 rounded-none border-t px-4 py-3 sm:justify-center">
            <Link
              href="/register/business"
              className={cn(buttonVariants({ size: "lg" }), "w-full min-w-[160px] sm:w-auto")}
            >
              Get Started
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
