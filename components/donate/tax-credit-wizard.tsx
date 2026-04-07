"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, CreditCard } from "lucide-react";

import { DonationFormStepper, StepBanner } from "@/components/donate/form-stepper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MOCK_CAMPAIGNS } from "@/lib/campaigns";
import {
  getMaxForYearAndFiling,
  getOriginalOverflowForYear,
  summarizeTaxCredit,
  TAX_CREDIT_MAX,
  type FilingStatus,
  type TaxYear,
} from "@/lib/tax-credit";
import { cn, formatCheckoutUsd } from "@/lib/utils";

type StoRow = { id: string; organization: string; amount: number };

const CAMP_NONE = "__none__";
const GRADE_NONE = "__none__";
const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;

function TogglePair({
  value,
  onChange,
  left,
  right,
  leftLabel,
  rightLabel,
  relaxed = false,
  brandSelect = false,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  left: boolean;
  right: boolean;
  /** Taller buttons, wrapping text, and optional stacking on very narrow viewports (modal tax flow). */
  relaxed?: boolean;
  /** Selected segment uses brand navy (#001138) with white text (filing status control). */
  brandSelect?: boolean;
}) {
  const leftOn = value === left;
  const selectedBrand = "bg-[#001138] text-white shadow-sm hover:bg-[#001138] hover:text-white";
  const selectedDefault = "bg-background text-foreground shadow-sm";
  const unselectedBrand =
    "bg-background text-foreground hover:bg-muted/60 dark:bg-background/80";
  return (
    <div
      className={cn(
        "grid w-full rounded-lg border border-input bg-muted/40 p-1 shadow-xs",
        relaxed
          ? "grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2"
          : "grid h-10 grid-cols-2 gap-0"
      )}
      role="group"
    >
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "min-w-0 w-full rounded-md font-medium shadow-none",
          relaxed
            ? "h-auto min-h-11 whitespace-normal px-2 py-2.5 text-left text-sm leading-snug sm:px-3 sm:text-center"
            : "h-8",
          leftOn
            ? brandSelect
              ? selectedBrand
              : selectedDefault
            : brandSelect
              ? unselectedBrand
              : undefined
        )}
        onClick={() => onChange(left)}
      >
        {leftLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "min-w-0 w-full rounded-md font-medium shadow-none",
          relaxed
            ? "h-auto min-h-11 whitespace-normal px-2 py-2.5 text-left text-sm leading-snug sm:px-3 sm:text-center"
            : "h-8",
          !leftOn
            ? brandSelect
              ? selectedBrand
              : selectedDefault
            : brandSelect
              ? unselectedBrand
              : undefined
        )}
        onClick={() => onChange(right)}
      >
        {rightLabel}
      </Button>
    </div>
  );
}

function WizardShell({
  step,
  title,
  description,
  children,
  footer,
  footerLayout = "between",
  embedInDialog = false,
  stepBannerLabel,
}: {
  step: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  footerLayout?: "between" | "end" | "start";
  embedInDialog?: boolean;
  stepBannerLabel?: string;
}) {
  return (
    <Card
      className={cn(
        "border-border/80 shadow-sm",
        embedInDialog && "border-0 shadow-none ring-0"
      )}
    >
      {!embedInDialog ? (
        <CardHeader className="border-b border-border/60 bg-muted/15">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="font-heading text-xl sm:text-2xl">{title}</CardTitle>
              <CardDescription className="text-pretty">{description}</CardDescription>
            </div>
            <Badge variant="outline" className="h-fit w-fit shrink-0 font-normal">
              Step {step} of 4
            </Badge>
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn("space-y-8 pt-6", embedInDialog && "space-y-6 pt-2")}>
        {embedInDialog && stepBannerLabel ? (
          <StepBanner step={step} subtitle={stepBannerLabel} />
        ) : null}
        {children}
      </CardContent>
      {footer ? (
        <CardFooter
          className={cn(
            "gap-2 border-t",
            embedInDialog && "bg-muted/40 px-5 py-4 sm:px-8",
            footerLayout === "between" && "flex flex-col-reverse sm:flex-row sm:justify-between",
            footerLayout === "end" && "flex justify-end",
            footerLayout === "start" && "flex justify-start"
          )}
        >
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}

function FormField({
  label,
  htmlFor,
  children,
  className,
  labelClassName,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  /** e.g. whitespace-nowrap so short columns don’t wrap the label */
  labelClassName?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className={cn("text-sm font-medium", labelClassName)}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function ChoiceLegend({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium leading-none">{children}</p>;
}

function CheckField({
  id,
  checked,
  onCheckedChange,
  children,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-1 shrink-0"
      />
      {/* Label defaults to flex; that splits text + Link into columns. Block + inline children reads as one paragraph. */}
      <Label
        htmlFor={id}
        className="block min-w-0 flex-1 cursor-pointer text-sm leading-snug font-normal"
      >
        {children}
      </Label>
    </div>
  );
}

function TaxCreditBreakdownCard({
  taxYear,
  donationAmount,
  eligibleCredit,
  futureCarryForward,
}: {
  taxYear: TaxYear;
  donationAmount: number;
  eligibleCredit: number;
  futureCarryForward: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border text-sm">
      <div className="flex items-center justify-between bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
        <span>Tax Credit Breakdown</span>
        <span className="max-w-[45%] text-right text-[10px] font-medium opacity-90 sm:text-xs">
          A.R.S. § 43-1089
        </span>
      </div>
      <div className="border-b border-border/60 bg-card px-3 py-2.5">
        <div className="flex justify-between font-semibold text-foreground">
          <span>Total Donation</span>
          <span className="tabular-nums">{formatCheckoutUsd(donationAmount)}</span>
        </div>
        <p className="text-xs text-muted-foreground">Amount being processed</p>
      </div>
      <div
        className={cn(
          "flex items-start justify-between gap-3 bg-act-action/10 px-3 py-2.5 text-act-action",
          futureCarryForward > 0 && "border-b border-border/60"
        )}
      >
        <div>
          <p className="font-semibold">{taxYear} Tax Credit</p>
          <p className="text-xs opacity-90">Claimed on your {taxYear} AZ return</p>
        </div>
        <span className="shrink-0 font-semibold tabular-nums">{formatCheckoutUsd(eligibleCredit)}</span>
      </div>
      {futureCarryForward > 0 ? (
        <div className="flex items-start justify-between gap-3 bg-orange-50 px-3 py-2.5 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100">
          <div className="min-w-0 space-y-2">
            <p className="font-semibold">Future Tax Credit</p>
            <p className="text-xs leading-snug opacity-90">
              Total donated this tax year exceeds this credit maximum. This excess amount may be
              treated as a tax deductible donation or carried forward as a tax credit up to 5 years
              (A.R.S. 43-1089).
            </p>
          </div>
          <span className="shrink-0 font-semibold tabular-nums">
            {formatCheckoutUsd(futureCarryForward)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Reference limits for the donor’s selected tax year + filing only; mirrors TaxCreditBreakdownCard layout. */
function TaxCreditLimitsSummaryCard({
  taxYear,
  filing,
}: {
  taxYear: TaxYear;
  filing: FilingStatus;
}) {
  const caps = getOriginalOverflowForYear(taxYear);
  const row = filing === "single" ? caps.single : caps.married;
  const filingLabel = filing === "single" ? "Single Taxpayer" : "Married Filing Jointly";

  return (
    <div className="space-y-3">
      <div>
        <p className="font-heading text-base font-semibold text-primary">Final summary</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Annual original and overflow caps for your selected tax year and filing status.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border text-sm">
        <div className="flex items-center justify-between bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          <span>{taxYear} tax credit limits</span>
          <span className="max-w-[45%] text-right text-[10px] font-medium opacity-90 sm:text-xs">
            A.R.S. § 43-1089
          </span>
        </div>

        <div className="border-b border-border/60 bg-muted/25 px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">Tax year</p>
              <p className="text-xs text-muted-foreground">Applies to this donation summary</p>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{taxYear}</span>
          </div>
        </div>

        <div className="border-b border-border/60 bg-muted/25 px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">Filing status</p>
              <p className="text-xs text-muted-foreground">As selected in step 2</p>
            </div>
            <span className="max-w-[55%] text-right font-semibold text-foreground">{filingLabel}</span>
          </div>
        </div>

        <div className="border-b border-border/60 bg-card px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Original tax credit</p>
              <p className="text-xs text-muted-foreground">Original tuition tax credit component</p>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">
              {formatCheckoutUsd(row.original)}
            </span>
          </div>
        </div>

        <div className="border-b border-border/60 bg-orange-50 px-3 py-2.5 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">Overflow tax credit</p>
              <p className="text-xs leading-snug opacity-90">
                Overflow component toward your combined annual cap
              </p>
            </div>
            <span className="shrink-0 font-semibold tabular-nums">{formatCheckoutUsd(row.overflow)}</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 bg-act-action/10 px-3 py-2.5 text-act-action">
          <div>
            <p className="font-semibold">Combined total</p>
            <p className="text-xs opacity-90">Maximum combined credit for {taxYear}</p>
          </div>
          <span className="shrink-0 font-semibold tabular-nums">{formatCheckoutUsd(row.combined)}</span>
        </div>
      </div>

      <div className="rounded-lg bg-[#001138] px-3 py-3 text-center text-[10px] leading-snug italic text-white sm:text-xs">
        You may donate up to these amounts or your actual state tax liability, whichever is less.
      </div>
    </div>
  );
}

function LiabilityWaiverBlock() {
  return (
    <div className="space-y-2 rounded-lg border border-border/80 bg-muted/25 p-4">
      <p className="text-sm font-semibold text-foreground">Liability waiver</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Tax laws, codes, deductions, and tax credit rules may vary by state and individual
        circumstance. arizonachristiantuition.com and ACTSTO.org are not responsible for your tax
        filing or for determining your eligibility for any deduction or tax credit. Please consult a
        qualified tax professional for guidance regarding your specific situation.
      </p>
    </div>
  );
}

export function TaxCreditWizard({
  embedInDialog = false,
  initialCampaignSlug,
  supportSubtitle,
  onBackToChoose,
  onExitFlow,
}: {
  embedInDialog?: boolean;
  initialCampaignSlug?: string;
  supportSubtitle?: string;
  onBackToChoose?: () => void;
  onExitFlow?: () => void;
} = {}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [firstName, setFirstName] = useState("Jeremy");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("Waters");
  const [billingAddress, setBillingAddress] = useState("3605 W Harrison St");
  const [unit, setUnit] = useState("");
  const [city, setCity] = useState("Chandler");
  const [state, setState] = useState("AZ");
  const [zip, setZip] = useState("85226");
  const [email, setEmail] = useState("jwaters@qallus.co");
  const [phone, setPhone] = useState("+1 (480) 352-7598");

  const [designateStudent, setDesignateStudent] = useState(!embedInDialog);
  const [campaignSlug, setCampaignSlug] = useState(
    initialCampaignSlug ?? MOCK_CAMPAIGNS[0]?.slug ?? ""
  );
  const [studentFirst, setStudentFirst] = useState("");
  const [studentLast, setStudentLast] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState("");
  const [relationshipAck, setRelationshipAck] = useState(false);

  const [taxYear, setTaxYear] = useState<TaxYear>("2026");
  const [filing, setFiling] = useState<FilingStatus>("single");
  const [hasOtherSto, setHasOtherSto] = useState(embedInDialog ? false : true);
  const [stoRows, setStoRows] = useState<StoRow[]>([
    { id: "1", organization: "", amount: 0 },
  ]);
  const [donationRaw, setDonationRaw] = useState(embedInDialog ? "250" : "100");
  /** Prior gifts to ACT this tax year toward the same individual credit */
  const [priorActRaw, setPriorActRaw] = useState("");
  const [taxAck, setTaxAck] = useState(false);

  const [billingSame, setBillingSame] = useState(true);
  const [uniqueBilling, setUniqueBilling] = useState(false);

  const [terms, setTerms] = useState(false);
  const [gdpr, setGdpr] = useState(false);

  /** Embedded step 4: PayPal row vs inline card form (must not call onExitFlow until checkout completes). */
  const [embedPaymentView, setEmbedPaymentView] = useState<"methods" | "card">("methods");

  const otherStoTotal = useMemo(
    () => stoRows.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0),
    [stoRows]
  );

  const donationAmount = Number.parseFloat(donationRaw.replace(/[^0-9.]/g, "")) || 0;
  const priorActDonationsThisYear =
    Number.parseFloat(priorActRaw.replace(/[^0-9.]/g, "")) || 0;

  const summary = useMemo(
    () =>
      summarizeTaxCredit({
        taxYear,
        filing,
        otherStoTotal,
        priorActDonationsThisYear,
        actDonation: donationAmount,
      }),
    [donationAmount, filing, otherStoTotal, priorActDonationsThisYear, taxYear]
  );

  const maxForSelection = getMaxForYearAndFiling(taxYear, filing);

  useEffect(() => {
    if (initialCampaignSlug) setCampaignSlug(initialCampaignSlug);
  }, [initialCampaignSlug]);

  useEffect(() => {
    if (step !== 4) setEmbedPaymentView("methods");
  }, [step]);

  function addStoRow() {
    setStoRows((r) => [
      ...r,
      { id: crypto.randomUUID(), organization: "", amount: 0 },
    ]);
  }

  function removeStoRow(id: string) {
    setStoRows((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== id)));
  }

  const campaignSelectValue = campaignSlug || CAMP_NONE;
  const gradeSelectValue = grade || GRADE_NONE;

  return (
    <div
      className={cn(
        embedInDialog ? "space-y-4" : "mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6"
      )}
    >
      {embedInDialog ? (
        <div className="space-y-2 border-b border-border/60 pb-4">
          <div className="min-w-0">
            <h2 className="font-heading text-xl font-semibold text-primary sm:text-2xl">
              Tax Credit Donation
            </h2>
            {supportSubtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{supportSubtitle}</p>
            ) : null}
          </div>
          {onBackToChoose ? (
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-2 hover:underline"
              onClick={onBackToChoose}
            >
              ← Back to donation options
            </button>
          ) : null}
        </div>
      ) : null}

      <DonationFormStepper current={step} />

      {step === 1 && (
        <WizardShell
          step={1}
          title="Donors"
          description="Enter the billing contact for this Arizona tax-credit donation."
          footerLayout="end"
          embedInDialog={embedInDialog}
          stepBannerLabel={embedInDialog ? "Donor Information" : undefined}
          footer={
            embedInDialog ? (
              <Button type="button" onClick={() => setStep(2)} className="gap-1">
                Next
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button type="button" onClick={() => setStep(2)}>
                Continue
              </Button>
            )
          }
        >
          <div className={cn("space-y-6", embedInDialog && "sm:space-y-7")}>
            {embedInDialog ? (
              <p className="text-sm text-muted-foreground">
                Enter your personal information below.
              </p>
            ) : null}
            <div
              className={cn(
                "grid gap-4 sm:grid-cols-12",
                embedInDialog && "sm:gap-x-6 sm:gap-y-3"
              )}
            >
              <FormField label="First name" htmlFor="fn" className="sm:col-span-4">
                <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </FormField>
              <FormField
                label="Middle name"
                htmlFor="mn"
                className="sm:col-span-4"
                labelClassName="whitespace-nowrap"
              >
                <Input
                  id="mn"
                  placeholder="Optional"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </FormField>
              <FormField label="Last name" htmlFor="ln" className="sm:col-span-4">
                <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </FormField>
            </div>
            <div
              className={cn(
                "grid gap-4 sm:grid-cols-12",
                embedInDialog && "sm:gap-x-6 sm:gap-y-3"
              )}
            >
              <FormField label="Billing address" htmlFor="addr" className="sm:col-span-8">
                <Input
                  id="addr"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Unit / suite" htmlFor="unit" className="sm:col-span-4">
                <Input
                  id="unit"
                  placeholder="Optional"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </FormField>
            </div>
            <div
              className={cn(
                "grid gap-4 sm:grid-cols-12",
                embedInDialog && "sm:gap-x-6 sm:gap-y-3"
              )}
            >
              <FormField label="State" htmlFor="st" className="sm:col-span-2">
                <Input id="st" value={state} onChange={(e) => setState(e.target.value)} />
              </FormField>
              <FormField label="City" htmlFor="city" className="sm:col-span-5">
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </FormField>
              <FormField label="ZIP code" htmlFor="zip" className="sm:col-span-5">
                <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} />
              </FormField>
            </div>
            <div
              className={cn(
                "grid gap-4 sm:grid-cols-2",
                embedInDialog && "sm:gap-x-6 sm:gap-y-3"
              )}
            >
              <FormField label="Email" htmlFor="em">
                <Input
                  id="em"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>
              <FormField label="Phone" htmlFor="ph">
                <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FormField>
            </div>
          </div>
        </WizardShell>
      )}

      {step === 2 && (
        <WizardShell
          step={2}
          title="Taxes"
          description="Tax year, credits, and designation details for your gift."
          embedInDialog={embedInDialog}
          stepBannerLabel={embedInDialog ? "Tax Credit" : undefined}
          footer={
            embedInDialog ? (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Previous
                </Button>
                <Button type="button" onClick={() => setStep(3)} className="gap-1">
                  Next
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" onClick={() => setStep(3)}>
                  Continue
                </Button>
              </>
            )
          }
        >
          <div className="space-y-8">
            <div className="space-y-3">
              <ChoiceLegend>
                {embedInDialog
                  ? "Would you like to designate this donation for a specific student?"
                  : "Designate this donation for a specific student?"}
              </ChoiceLegend>
              <TogglePair
                value={designateStudent}
                onChange={setDesignateStudent}
                left
                right={false}
                leftLabel="Yes"
                rightLabel="No"
                relaxed={embedInDialog}
              />
            </div>

            {designateStudent && (
              <Card size="sm" className="bg-muted/20 shadow-none ring-1 ring-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Student designation</CardTitle>
                  <CardDescription>Optional scholarship recommendation details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField label="Campaign">
                    <Select
                      value={campaignSelectValue}
                      onValueChange={(v) => {
                        const s = v ?? "";
                        setCampaignSlug(s === CAMP_NONE ? "" : s);
                      }}
                    >
                      <SelectTrigger id="camp" className="h-10 w-full min-w-0">
                        <SelectValue placeholder="Select a campaign…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CAMP_NONE}>Select a campaign…</SelectItem>
                        {MOCK_CAMPAIGNS.map((c) => (
                          <SelectItem key={c.slug} value={c.slug}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Student first name">
                      <Input value={studentFirst} onChange={(e) => setStudentFirst(e.target.value)} />
                    </FormField>
                    <FormField label="Student last name">
                      <Input value={studentLast} onChange={(e) => setStudentLast(e.target.value)} />
                    </FormField>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="School name">
                      <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                    </FormField>
                    <FormField label="Grade level">
                      <Select
                        value={gradeSelectValue}
                        onValueChange={(v) => {
                          const s = v ?? "";
                          setGrade(s === GRADE_NONE ? "" : s);
                        }}
                      >
                        <SelectTrigger className="h-10 w-full min-w-0">
                          <SelectValue placeholder="Select grade…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={GRADE_NONE}>Select grade…</SelectItem>
                          {GRADES.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g === "K" ? "Kindergarten" : `Grade ${g}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <CheckField
                    id="rel-ack"
                    checked={relationshipAck}
                    onCheckedChange={setRelationshipAck}
                  >
                    Relationship policy: I understand that I may not designate or direct this
                    donation to benefit my own dependent or family member.
                  </CheckField>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <ChoiceLegend>Tax year {taxYear}</ChoiceLegend>
                <span className="text-muted-foreground">
                  Single {formatCheckoutUsd(TAX_CREDIT_MAX[taxYear].single)} · Married{" "}
                  {formatCheckoutUsd(TAX_CREDIT_MAX[taxYear].married)}
                </span>
              </div>
              <TogglePair
                value={taxYear === "2026"}
                onChange={(v) => setTaxYear(v ? "2026" : "2025")}
                left={false}
                right
                leftLabel="2025 tax year"
                rightLabel="2026 tax year"
                relaxed={embedInDialog}
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Annual credit limit — Single{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCheckoutUsd(TAX_CREDIT_MAX[taxYear].single)}
                </span>{" "}
                · Married{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCheckoutUsd(TAX_CREDIT_MAX[taxYear].married)}
                </span>
              </p>
              <ChoiceLegend>Select Your Tax Filing Status</ChoiceLegend>
              <TogglePair
                value={filing === "single"}
                onChange={(v) => setFiling(v ? "single" : "married")}
                left
                right={false}
                leftLabel="Single Taxpayer"
                rightLabel="Married Filing Jointly"
                relaxed={embedInDialog}
                brandSelect
              />
              {embedInDialog ? (
                <div className="rounded-lg bg-act-banner/80 px-3 py-2.5 text-sm text-act-banner-foreground">
                  Your {taxYear} credit limit:{" "}
                  <span className="font-semibold tabular-nums">{formatCheckoutUsd(maxForSelection)}</span>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <ChoiceLegend>Previous Donations</ChoiceLegend>
              <p className="text-sm text-muted-foreground">
                Have you donated to another School Tuition Organization (STO) or have an amount
                carried forward from a prior year for the selected tax year?
              </p>
              <TogglePair
                value={hasOtherSto}
                onChange={setHasOtherSto}
                left
                right={false}
                leftLabel={embedInDialog ? "Yes — I previously donated" : "Yes — previously donated"}
                rightLabel={embedInDialog ? "No — I haven't donated" : "No — not yet"}
                relaxed={embedInDialog}
              />
            </div>

            {hasOtherSto && (
              <Card size="sm" className="bg-muted/15 shadow-none ring-1 ring-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Other STO gifts</CardTitle>
                  <CardDescription>Enter amounts already given to other organizations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stoRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-col gap-3 rounded-lg border border-border/50 bg-background/80 p-3 sm:flex-row sm:flex-wrap sm:items-end"
                    >
                      <FormField label="School tuition organization" className="min-w-0 flex-1">
                        <Input
                          value={row.organization}
                          onChange={(e) =>
                            setStoRows((rows) =>
                              rows.map((r) =>
                                r.id === row.id ? { ...r, organization: e.target.value } : r
                              )
                            )
                          }
                        />
                      </FormField>
                      <FormField label="Amount" className="w-full sm:w-36">
                        <Input
                          inputMode="decimal"
                          value={row.amount ? String(row.amount) : ""}
                          onChange={(e) => {
                            const n = Number.parseFloat(e.target.value) || 0;
                            setStoRows((rows) =>
                              rows.map((r) => (r.id === row.id ? { ...r, amount: n } : r))
                            );
                          }}
                        />
                      </FormField>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeStoRow(row.id)}
                        >
                          Remove
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={addStoRow}>
                          Add row
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <FormField label="Prior ACT gifts this tax year (optional)" htmlFor="prior-act-ytd">
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="prior-act-ytd"
                    className="pl-7"
                    inputMode="decimal"
                    placeholder="0"
                    value={priorActRaw}
                    onChange={(e) => setPriorActRaw(e.target.value)}
                  />
                </div>
              </FormField>
              <p className="text-xs text-muted-foreground">
                Other amounts you already donated to Arizona Christian Tuition this tax year that
                count toward this same credit. Combined with today&apos;s gift, anything over your
                limit may be carried forward up to five years.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter today&apos;s gift or use <span className="font-medium">Calculate max</span>{" "}
                for remaining capacity after other STO and prior ACT gifts.
              </p>
              <div
                className={cn(
                  "flex flex-col gap-4",
                  embedInDialog ? "md:flex-row md:flex-wrap md:items-end" : "lg:flex-row lg:items-end"
                )}
              >
                <FormField
                  label="Donation amount"
                  htmlFor="amt"
                  className={cn("flex-1", embedInDialog && "min-w-[min(100%,14rem)]")}
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="amt"
                      className="pl-7"
                      inputMode="decimal"
                      value={donationRaw}
                      onChange={(e) => setDonationRaw(e.target.value)}
                    />
                  </div>
                </FormField>
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(
                    "w-full shrink-0 whitespace-nowrap",
                    embedInDialog ? "md:w-auto" : "lg:w-auto"
                  )}
                  onClick={() =>
                    setDonationRaw(
                      String(
                        Math.max(
                          0,
                          maxForSelection - otherStoTotal - priorActDonationsThisYear
                        )
                      )
                    )
                  }
                >
                  Calculate max
                </Button>
                <div
                  className={cn(
                    "flex flex-1 flex-col justify-end space-y-2",
                    embedInDialog && "min-w-[min(100%,14rem)]"
                  )}
                >
                  <p className="text-sm font-medium text-foreground">ACT donation (confirmed)</p>
                  <p className="font-heading text-2xl font-semibold text-primary tabular-nums sm:text-3xl md:text-4xl">
                    {formatCheckoutUsd(donationAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">Based on the donation amount entered above</p>
                </div>
              </div>
              {embedInDialog ? (
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-xs font-medium sm:text-sm"
                    onClick={() => setDonationRaw(String(maxForSelection))}
                  >
                    Max Credit {formatCheckoutUsd(maxForSelection)}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-xs font-medium sm:text-sm"
                    onClick={() => setDonationRaw((maxForSelection * 1.5).toFixed(2))}
                  >
                    {formatCheckoutUsd(maxForSelection * 1.5)}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-xs font-medium sm:text-sm"
                    onClick={() =>
                      setDonationRaw(String(getMaxForYearAndFiling(taxYear, "married")))
                    }
                  >
                    {formatCheckoutUsd(getMaxForYearAndFiling(taxYear, "married"))}
                  </Button>
                </div>
              ) : null}
              <CheckField id="tax-ack" checked={taxAck} onCheckedChange={setTaxAck}>
                Tax credit acknowledgment: I understand the information shown.
              </CheckField>
              <TaxCreditBreakdownCard
                taxYear={taxYear}
                donationAmount={donationAmount}
                eligibleCredit={summary.eligibleCredit}
                futureCarryForward={summary.futureCarryForward}
              />
              {!embedInDialog ? (
                <Alert>
                  <AlertDescription>
                    A.R.S. § 43-1603(C) — Scholarships must not be directed to benefit the donor&apos;s
                    own dependents; limits apply. This UI is not tax advice.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            {!embedInDialog ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card size="sm" className="shadow-none ring-1 ring-border/60">
                  <CardHeader className="pb-1">
                    <CardDescription className="text-xs font-medium tracking-wide uppercase">
                      Eligible Arizona credit
                    </CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums text-primary">
                      {formatCheckoutUsd(summary.eligibleCredit)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card size="sm" className="shadow-none ring-1 ring-border/60">
                  <CardHeader className="pb-1">
                    <CardDescription className="text-xs font-medium tracking-wide uppercase">
                      Tax deduction (display)
                    </CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums text-primary">
                      {formatCheckoutUsd(summary.taxDeductionDisplay)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
            ) : null}
          </div>
        </WizardShell>
      )}

      {step === 3 && (
        <WizardShell
          step={3}
          title="Billing Address"
          description="Billing preferences and checkout (PayPal in production)."
          embedInDialog={embedInDialog}
          stepBannerLabel={embedInDialog ? "Billing Address" : undefined}
          footer={
            embedInDialog ? (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Previous
                </Button>
                <Button type="button" onClick={() => setStep(4)} className="gap-1">
                  Next
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" onClick={() => setStep(4)}>
                  Continue
                </Button>
              </>
            )
          }
        >
          <div className="space-y-8">
            <div className="space-y-4">
              {embedInDialog ? (
                <>
                  <h3 className="font-heading text-lg font-semibold text-primary">Billing Address</h3>
                  <Separator />
                </>
              ) : (
                <div>
                  <h3 className="text-sm font-medium">Billing address</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use the donor address from step 1 or enter a different cardholder address.
                  </p>
                </div>
              )}
              {!embedInDialog ? <Separator /> : null}
              <div className="space-y-2">
                <CheckField
                  id="bill-same"
                  checked={billingSame}
                  onCheckedChange={(on) => {
                    setBillingSame(on);
                    if (on) setUniqueBilling(false);
                  }}
                >
                  Billing address same as donor{embedInDialog ? " address." : ""}
                </CheckField>
                <CheckField
                  id="bill-unique"
                  checked={uniqueBilling}
                  onCheckedChange={(on) => {
                    setUniqueBilling(on);
                    if (on) setBillingSame(false);
                  }}
                >
                  Use a different billing address
                </CheckField>
              </div>
            </div>

            {embedInDialog && billingSame ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-act-banner/50 p-4 text-sm ring-1 ring-border/60">
                  <p className="font-semibold text-primary">
                    {firstName} {lastName}
                  </p>
                  <p className="mt-1 text-muted-foreground">{billingAddress}</p>
                  <p className="text-muted-foreground">
                    {city}, {state} {zip}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm">
                  <p className="font-heading font-semibold text-primary">Donation Summary</p>
                  <div className="mt-3 flex justify-between font-medium text-foreground">
                    <span>Total Donation</span>
                    <span className="tabular-nums">{formatCheckoutUsd(donationAmount)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-act-action">
                    <span className="font-semibold">{taxYear} Tax Credit</span>
                    <span className="font-semibold tabular-nums">
                      {formatCheckoutUsd(summary.eligibleCredit)}
                    </span>
                  </div>
                  {summary.futureCarryForward > 0 ? (
                    <div className="mt-2 flex justify-between text-orange-900 dark:text-orange-100">
                      <span className="font-semibold">Future Tax Credit</span>
                      <span className="font-semibold tabular-nums">
                        {formatCheckoutUsd(summary.futureCarryForward)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!embedInDialog ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Card &amp; wallet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    PayPal Smart Payment Buttons (vaulting, 3DS, webhooks) plug in here for production.
                  </p>
                </div>
                <Separator />
                <div className="flex max-w-md flex-col gap-2">
                  <Button type="button" variant="paypal" className="h-11 w-full">
                    PayPal
                  </Button>
                  <Button type="button" variant="paypalCard" className="h-11 w-full">
                    Debit or credit card
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </WizardShell>
      )}

      {step === 4 && (
        <WizardShell
          step={4}
          title="Review"
          description="Confirm your details before completing the donation."
          embedInDialog={embedInDialog}
          stepBannerLabel={embedInDialog ? "Review & Pay" : undefined}
          footerLayout="start"
          footer={
            <Button type="button" variant="outline" onClick={() => setStep(3)}>
              {embedInDialog ? "Previous" : "Back"}
            </Button>
          }
        >
          {embedInDialog ? (
            <div className="space-y-5 text-sm">
              <div className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-center text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                ACT Donation Summary
              </div>

              <div>
                <p className="mb-3 font-heading text-base font-semibold text-primary">
                  Review Your Donation
                </p>
                <div className="grid gap-2 rounded-lg border border-border/60 bg-card p-4">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">First Name</span>
                    <span className="text-right font-medium text-foreground">{firstName}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Last Name</span>
                    <span className="text-right font-medium text-foreground">{lastName}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Billing Address</span>
                    <span className="max-w-[55%] text-right font-medium text-foreground">
                      {billingAddress}
                      {unit ? `, ${unit}` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">City, State ZIP</span>
                    <span className="text-right font-medium text-foreground">
                      {city}, {state} {zip}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Email</span>
                    <span className="max-w-[55%] break-all text-right font-medium text-foreground">
                      {email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between border-b border-border/60 py-2">
                <span className="text-muted-foreground">Designating for specific student</span>
                <span className="font-medium text-foreground">{designateStudent ? "Yes" : "No"}</span>
              </div>

              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                  Tax Credit Information
                </p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Year</span>
                  <span className="font-medium tabular-nums">{taxYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filing status</span>
                  <span className="max-w-[55%] text-right font-medium">
                    {filing === "single" ? "Single Taxpayer" : "Married Filing Jointly"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Limit</span>
                  <span className="font-medium tabular-nums">{formatCheckoutUsd(maxForSelection)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous STO Donations</span>
                  <span className="font-medium tabular-nums">{formatCheckoutUsd(otherStoTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prior ACT gifts (this tax year)</span>
                  <span className="font-medium tabular-nums">
                    {formatCheckoutUsd(priorActDonationsThisYear)}
                  </span>
                </div>
              </div>

              <TaxCreditBreakdownCard
                taxYear={taxYear}
                donationAmount={donationAmount}
                eligibleCredit={summary.eligibleCredit}
                futureCarryForward={summary.futureCarryForward}
              />

              <TaxCreditLimitsSummaryCard taxYear={taxYear} filing={filing} />

              <p className="text-center text-muted-foreground">
                Please review your donation information above before completing.
              </p>

              <CheckField id="terms" checked={terms} onCheckedChange={setTerms}>
                I agree to the{" "}
                <Link href="/legal/terms" className="text-primary underline-offset-4 hover:underline">
                  terms and conditions
                </Link>{" "}
                and confirm the information provided is accurate.
              </CheckField>

              <div className="rounded-lg bg-muted/50 p-3 text-[11px] leading-snug text-muted-foreground">
                School tuition organization contributions are subject to Arizona law. Scholarships
                may not be directed to benefit the donor&apos;s dependents. See A.R.S. § 43-1603(C).
                This interface is not tax or legal advice.
              </div>

              <CheckField id="gdpr" checked={gdpr} onCheckedChange={setGdpr}>
                I consent to Arizona Christian Tuition storing my submitted information so they can
                respond to my inquiry.
              </CheckField>

              <LiabilityWaiverBlock />

              {embedPaymentView === "methods" ? (
                <>
                  <p className="text-center text-sm font-medium text-foreground">
                    Complete your {formatCheckoutUsd(donationAmount)} donation via PayPal
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="paypal"
                      className="h-11 w-full gap-2"
                      disabled={!terms || !gdpr}
                      onClick={() => {
                        /* PayPal Smart Payment Buttons in production */
                      }}
                    >
                      <Image
                        src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
                        alt=""
                        width={20}
                        height={20}
                        className="size-5"
                        unoptimized
                      />
                      PayPal Donate
                    </Button>
                    <Button
                      type="button"
                      variant="paypal"
                      className="h-11 w-full gap-2"
                      disabled={!terms || !gdpr}
                      onClick={() => {
                        /* PayPal Pay Later in production */
                      }}
                    >
                      <span className="text-lg font-bold text-[#003087]">P</span>
                      Pay Later
                    </Button>
                    <Button
                      type="button"
                      variant="paypalCard"
                      className="h-11 w-full gap-2"
                      disabled={!terms || !gdpr}
                      onClick={() => setEmbedPaymentView("card")}
                    >
                      <CreditCard className="size-5" aria-hidden />
                      Debit or Credit Card
                    </Button>
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground">
                    Powered by PayPal — connect keys in production.
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-lg bg-act-charcoal px-4 py-3 text-center text-sm font-semibold text-white">
                    <span className="inline-flex items-center justify-center gap-2">
                      <CreditCard className="size-4" aria-hidden />
                      Debit or Credit Card
                    </span>
                  </div>
                  <div className="space-y-3 rounded-lg border border-border/80 p-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="tax-card-email">Email</Label>
                      <Input
                        id="tax-card-email"
                        type="email"
                        placeholder="you@example.com"
                        defaultValue={email}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tax-card-num">Card number</Label>
                      <Input
                        id="tax-card-num"
                        inputMode="numeric"
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="tax-card-exp">Expires</Label>
                        <Input id="tax-card-exp" placeholder="MM / YY" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tax-card-csc">CSC</Label>
                        <Input id="tax-card-csc" placeholder="CVC" />
                      </div>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Billing address</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="tax-card-fn">First name</Label>
                        <Input id="tax-card-fn" defaultValue={firstName} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tax-card-ln">Last name</Label>
                        <Input id="tax-card-ln" defaultValue={lastName} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tax-card-zip">ZIP code</Label>
                      <Input id="tax-card-zip" defaultValue={zip} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tax-card-mobile">Mobile (+1)</Label>
                      <Input id="tax-card-mobile" type="tel" defaultValue={phone} />
                    </div>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    By continuing, you confirm you&apos;re 18 years or older.
                  </p>
                  <Button
                    type="button"
                    variant="checkoutPay"
                    className="mt-4"
                    onClick={() => onExitFlow?.()}
                  >
                    Pay {formatCheckoutUsd(donationAmount)}
                  </Button>
                  <p className="mt-3 text-center text-[10px] text-muted-foreground">
                    Powered by PayPal — connect keys in production.
                  </p>
                  <button
                    type="button"
                    className="w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => setEmbedPaymentView("methods")}
                  >
                    ← Back to payment methods
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              <Card size="sm" className="shadow-none ring-1 ring-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Donor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-muted-foreground">
                  <div className="flex justify-between gap-4">
                    <span>Name</span>
                    <span className="text-right text-foreground">
                      {firstName} {middleName} {lastName}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Address</span>
                    <span className="text-right text-foreground">
                      {billingAddress}
                      {unit ? `, ${unit}` : ""}, {city}, {state} {zip}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Email</span>
                    <span className="text-foreground">{email}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Phone</span>
                    <span className="text-foreground">{phone}</span>
                  </div>
                </CardContent>
              </Card>

              <Card size="sm" className="shadow-none ring-1 ring-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Scholarship designation</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  {designateStudent
                    ? `${campaignSlug || "—"} · ${studentFirst} ${studentLast} · ${schoolName} · Grade ${grade}`
                    : "No specific student designation."}
                </CardContent>
              </Card>

              <Card size="sm" className="shadow-none ring-1 ring-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Amounts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Other STO gifts</span>
                    <span className="tabular-nums text-foreground">{formatCheckoutUsd(otherStoTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ACT donation</span>
                    <span className="tabular-nums text-foreground">{formatCheckoutUsd(donationAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prior ACT gifts (YTD)</span>
                    <span className="tabular-nums text-foreground">
                      {formatCheckoutUsd(priorActDonationsThisYear)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Eligible credit (this year)</span>
                    <span className="tabular-nums text-foreground">
                      {formatCheckoutUsd(summary.eligibleCredit)}
                    </span>
                  </div>
                  {summary.futureCarryForward > 0 ? (
                    <div className="flex justify-between">
                      <span>Future carry-forward (est.)</span>
                      <span className="tabular-nums text-foreground">
                        {formatCheckoutUsd(summary.futureCarryForward)}
                      </span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <TaxCreditBreakdownCard
                taxYear={taxYear}
                donationAmount={donationAmount}
                eligibleCredit={summary.eligibleCredit}
                futureCarryForward={summary.futureCarryForward}
              />

              <TaxCreditLimitsSummaryCard taxYear={taxYear} filing={filing} />

              <Alert>
                <AlertDescription>
                  A.R.S. § 43-1603(C) — Scholarship recommendations cannot be directed for the benefit
                  of the taxpayer or the taxpayer&apos;s dependents, subject to applicable law.
                </AlertDescription>
              </Alert>

              <CheckField id="terms" checked={terms} onCheckedChange={setTerms}>
                I agree to the{" "}
                <Link href="/legal/terms" className="text-primary underline-offset-4 hover:underline">
                  terms and conditions
                </Link>{" "}
                and confirm the information provided is accurate.
              </CheckField>

              <CheckField id="gdpr" checked={gdpr} onCheckedChange={setGdpr}>
                I consent to Arizona Christian Tuition storing my submitted information so they can
                respond to my inquiry.
              </CheckField>

              <LiabilityWaiverBlock />

              <Button
                type="button"
                className="h-10 w-full text-base sm:h-11"
                disabled={!terms || !gdpr}
                onClick={() => onExitFlow?.()}
              >
                Complete donation
              </Button>
            </div>
          )}
        </WizardShell>
      )}
    </div>
  );
}
