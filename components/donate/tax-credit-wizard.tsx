"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { ChevronRight } from "lucide-react";

import { DonationFormStepper, StepBanner } from "@/components/donate/form-stepper";
import { SmsConsentCheckbox } from "@/components/sms-consent-checkbox";
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
import {
  getMaxForYearAndFiling,
  getOriginalOverflowForYear,
  summarizeTaxCredit,
  DEFAULT_TAX_CREDIT_LIMITS,
  donationTaxYears,
  type FilingStatus,
  type TaxCreditLimitConfig,
  type TaxYear,
} from "@/lib/tax-credit";
import { cn, formatCheckoutUsd } from "@/lib/utils";
import { CORPORATE_PROGRAMS, type CorporateProgram } from "@/lib/funding-sources";
import type { DonorPrefill } from "@/app/api/donate/prefill/route";
import type {
  DonationOptionCampaign,
  DonationOptionSchool,
} from "@/app/api/campaigns/donation-options/route";

type StoRow = { id: string; organization: string; amount: number };
type PaypalConfig = { clientId: string; environment: string };

const CAMP_NONE = "__none__";
const SCHOOL_NONE = "__none__";

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
  // A plain white chip on a light track read as unselected, so donors could
  // not tell which answer was active. The ring and weight make it unmistakable.
  const selectedDefault =
    "bg-background font-semibold text-primary shadow-sm ring-2 ring-primary/70 hover:bg-background";
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
        aria-pressed={leftOn}
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
        aria-pressed={!leftOn}
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
  error,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border bg-muted/10 px-3 py-3",
          error ? "border-destructive" : "border-border/60",
        )}
      >
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
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}
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
  taxLimits,
}: {
  taxYear: TaxYear;
  filing: FilingStatus;
  taxLimits: TaxCreditLimitConfig;
}) {
  const caps = getOriginalOverflowForYear(taxYear, taxLimits);
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

/**
 * Step 2 of the corporate form. A business chooses the program (required),
 * may recommend a school (default Valley Christian Schools), and never sees a
 * student question, a filing status or the individual credit limits.
 */
function CorporateProgramPanel({
  program,
  onProgram,
  programError,
  schools,
  schoolChoice,
  onSchoolChoice,
  campaignTitle,
  taxYear,
  offeredTaxYears,
  onTaxYear,
  donationRaw,
  onDonationRaw,
  adorPreApproval,
  onAdorPreApproval,
  relaxed,
}: {
  program: CorporateProgram | "";
  onProgram: (value: CorporateProgram) => void;
  programError: string | null;
  schools: DonationOptionSchool[];
  schoolChoice: string;
  onSchoolChoice: (value: string) => void;
  campaignTitle: string | null;
  taxYear: TaxYear;
  offeredTaxYears: TaxYear[];
  onTaxYear: (value: TaxYear) => void;
  donationRaw: string;
  onDonationRaw: (value: string) => void;
  adorPreApproval: string;
  onAdorPreApproval: (value: string) => void;
  relaxed: boolean;
}) {
  return (
    <div className="space-y-8">
      <div id="corp-program" className="space-y-3">
        <ChoiceLegend>Which program does this gift support?</ChoiceLegend>
        <div role="radiogroup" aria-label="Corporate program" className="grid gap-3">
          {CORPORATE_PROGRAMS.map((option) => {
            const on = program === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onProgram(option.value)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                  on ? "border-primary bg-primary/5 ring-2 ring-primary/60" : "border-border/70 hover:bg-muted/40",
                )}
              >
                <span className="block font-semibold text-foreground">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.detail}</span>
              </button>
            );
          })}
        </div>
        {programError ? (
          <p role="alert" className="text-sm text-destructive">
            {programError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <FormField label="Recommend a school (optional)" htmlFor="corp-school">
          <Select value={schoolChoice} onValueChange={(v) => onSchoolChoice(v ?? SCHOOL_NONE)}>
            <SelectTrigger id="corp-school" className="h-10 w-full min-w-0">
              <SelectValue placeholder="No preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SCHOOL_NONE}>No preference</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <p className="text-xs text-muted-foreground">
          Corporate gifts can recommend a school but never a specific student. A recommendation is not binding;
          our team awards the gift to eligible students under Arizona law.
          {campaignTitle ? ` Your gift still counts toward ${campaignTitle}.` : ""}
        </p>
      </div>

      {offeredTaxYears.length > 1 ? (
        <div className="space-y-3">
          <ChoiceLegend>Tax year</ChoiceLegend>
          <TogglePair
            value={taxYear === offeredTaxYears[1]}
            onChange={(v) => onTaxYear(v ? offeredTaxYears[1] : offeredTaxYears[0])}
            left
            right={false}
            leftLabel={`${offeredTaxYears[1]} tax year`}
            rightLabel={`${offeredTaxYears[0]} tax year`}
            relaxed={relaxed}
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Gift amount" htmlFor="corp-amt">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="corp-amt"
              className="pl-7"
              inputMode="decimal"
              value={donationRaw}
              onChange={(e) => onDonationRaw(e.target.value)}
            />
          </div>
        </FormField>
        <FormField label="ADOR pre-approval number (optional)" htmlFor="corp-ador">
          <Input id="corp-ador" value={adorPreApproval} onChange={(e) => onAdorPreApproval(e.target.value)} />
        </FormField>
      </div>

      <Alert>
        <AlertDescription>
          Arizona corporate tax credits (A.R.S. §§ 43-1183 and 43-1184) need pre-approval from the Arizona
          Department of Revenue before you give, and the credit can&apos;t exceed the approved amount. Individual
          filing status and limits don&apos;t apply. Your tax advisor can confirm the credit for your business.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function TaxCreditWizard({
  embedInDialog = false,
  initialCampaignSlug,
  supportSubtitle,
  onBackToChoose,
  onExitFlow,
  mode,
  prefill,
}: {
  embedInDialog?: boolean;
  initialCampaignSlug?: string;
  supportSubtitle?: string;
  onBackToChoose?: () => void;
  onExitFlow?: () => void;
  /**
   * "business" is the corporate form: business name, EIN, a program choice and
   * a school recommendation, with no student fields and no individual limits.
   * Left unset, a signed-in business donor gets the corporate form.
   */
  mode?: "individual" | "business";
  /**
   * The signed-in donor's details, loaded by the page on the server so step 1
   * is filled on first render. Null for a guest. Undefined means the page
   * didn't load them, and the form fetches them instead.
   */
  prefill?: DonorPrefill | null;
} = {}) {
  const pf = prefill ?? null;
  const pfState = pf?.state ? pf.state.toUpperCase().slice(0, 2) : "AZ";
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [taxLimits, setTaxLimits] = useState<TaxCreditLimitConfig>(DEFAULT_TAX_CREDIT_LIMITS);

  const [firstName, setFirstName] = useState(pf?.firstName ?? "");
  const [middleName, setMiddleName] = useState(pf?.middleName ?? "");
  const [lastName, setLastName] = useState(pf?.lastName ?? "");
  const [billingAddress, setBillingAddress] = useState(pf?.addressLine1 ?? "");
  const [unit, setUnit] = useState(pf?.addressLine2 ?? "");
  const [city, setCity] = useState(pf?.city ?? "");
  const [state, setState] = useState(pfState);
  const [zip, setZip] = useState(pf?.zip ?? "");
  const [email, setEmail] = useState(pf?.email || pf?.business?.businessEmail || "");
  const [phone, setPhone] = useState(pf?.phone || pf?.business?.businessPhone || "");
  const [prefilledFromAccount, setPrefilledFromAccount] = useState(Boolean(pf && (pf.firstName || pf.email || pf.addressLine1)));

  // Corporate form. Set by the prop, or by a signed-in business account.
  const [isBusiness, setIsBusiness] = useState(
    mode === "business" || (mode !== "individual" && pf?.accountRole === "donor_business"),
  );
  const [businessName, setBusinessName] = useState(pf?.business?.businessName ?? "");
  const [ein, setEin] = useState(pf?.business?.ein ?? "");
  const [contactTitle, setContactTitle] = useState("");
  const [program, setProgram] = useState<CorporateProgram | "">("");
  const [programError, setProgramError] = useState<string | null>(null);
  const [schools, setSchools] = useState<DonationOptionSchool[]>([]);
  // A corporate donor may recommend a school (never a student); Valley
  // Christian Schools is the default until they choose otherwise.
  const [schoolChoice, setSchoolChoice] = useState<string | null>(null);
  const [adorPreApproval, setAdorPreApproval] = useState("");

  // Through a campaign with students, recommending them is the default (Yes,
  // every student preselected). Elsewhere it starts at No. A Yes still needs
  // the relationship box, which step 2 checks before moving on.
  const [designateStudent, setDesignateStudent] = useState(false);
  // No preselected campaign. This used to default to the first sample campaign,
  // so a donor who never touched the picker could send a tax-credit gift toward
  // a campaign that does not exist.
  const [campaignSlug, setCampaignSlug] = useState(initialCampaignSlug ?? "");
  // Real campaigns only, loaded from /api/campaigns/donation-options. If that
  // request fails the picker stays empty rather than offering sample campaigns.
  const [campaignOptions, setCampaignOptions] = useState<DonationOptionCampaign[]>([]);
  const [campaignOptionsError, setCampaignOptionsError] = useState<string | null>(null);
  // Students picked from the campaign's own list — never typed names.
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [relationshipAck, setRelationshipAck] = useState(false);
  const [relationshipAckError, setRelationshipAckError] = useState<string | null>(null);

  const offeredTaxYears = useMemo(() => donationTaxYears(taxLimits), [taxLimits]);
  const [taxYearChoice, setTaxYear] = useState<TaxYear | null>(null);
  // Derived rather than synced, so it stays valid once the configured limits load.
  const taxYear: TaxYear =
    taxYearChoice && offeredTaxYears.includes(taxYearChoice) ? taxYearChoice : offeredTaxYears[0];
  const yearLimits = getOriginalOverflowForYear(taxYear, taxLimits);
  // The filing status saved on the donor's profile picks their credit limits.
  const [filing, setFiling] = useState<FilingStatus>(pf?.filingStatus ?? "single");
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
  const [smsConsent, setSmsConsent] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState<PaypalConfig | null>(null);
  const [paypalConfigError, setPaypalConfigError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [taxPaymentComplete, setTaxPaymentComplete] = useState(false);
  const donationIdRef = useRef<string | null>(null);
  const createOrderErrorRef = useRef<string | null>(null);

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
        limits: taxLimits,
      }),
    [donationAmount, filing, otherStoTotal, priorActDonationsThisYear, taxLimits, taxYear]
  );

  const maxForSelection = getMaxForYearAndFiling(taxYear, filing, taxLimits);
  const selectedCampaign = useMemo(
    () => campaignOptions.find((campaign) => campaign.slug === campaignSlug) ?? null,
    [campaignOptions, campaignSlug]
  );

  useEffect(() => {
    if (initialCampaignSlug) setCampaignSlug(initialCampaignSlug);
  }, [initialCampaignSlug]);

  // Signed-in donors: start step 1 from their account. Only empty fields are
  // filled, so nothing the donor already typed is replaced, and every field
  // stays editable for this gift without changing the profile. Guests get a
  // 401 and the form stays blank. SMS consent is never prefilled.
  useEffect(() => {
    // Already filled from the page on first render.
    if (prefill !== undefined) return;
    let cancelled = false;
    fetch("/api/donate/prefill", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<DonorPrefill>) : null))
      .then((p) => {
        if (cancelled || !p) return;
        const fill = (set: (fn: (v: string) => string) => void, value: string) => {
          if (value) set((current) => current || value);
        };
        fill(setFirstName, p.firstName);
        fill(setMiddleName, p.middleName);
        fill(setLastName, p.lastName);
        fill(setEmail, p.email);
        fill(setPhone, p.phone);
        fill(setBillingAddress, p.addressLine1);
        fill(setUnit, p.addressLine2);
        fill(setCity, p.city);
        fill(setZip, p.zip);
        // State starts as "AZ"; replace that default only, never a choice.
        if (p.state) setState((current) => (current === "AZ" || !current ? p.state.toUpperCase().slice(0, 2) : current));
        if (p.firstName || p.email || p.addressLine1) setPrefilledFromAccount(true);
        if (p.filingStatus) setFiling(p.filingStatus);
        // A business account gives as the business unless the page asked for
        // the individual form.
        if (p.accountRole === "donor_business" && mode !== "individual") setIsBusiness(true);
        if (p.business) {
          fill(setBusinessName, p.business.businessName);
          fill(setEin, p.business.ein);
          if (p.business.businessEmail) setEmail((current) => current || p.business!.businessEmail);
          if (p.business.businessPhone) setPhone((current) => current || p.business!.businessPhone);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount; `mode` is fixed for the page
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tax-credit-limits")
      .then((res) => res.json() as Promise<{ limits?: TaxCreditLimitConfig }>)
      .then((data) => {
        if (!cancelled && data.limits) setTaxLimits(data.limits);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/campaigns/donation-options")
      .then(
        (res) =>
          res.json() as Promise<{
            campaigns?: DonationOptionCampaign[];
            schools?: DonationOptionSchool[];
            defaultSchoolId?: string | null;
            error?: string;
          }>,
      )
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.campaigns) && data.campaigns.length > 0) {
          setCampaignOptions(data.campaigns);
          setCampaignOptionsError(null);
        } else if (data.error) {
          setCampaignOptionsError(data.error);
        }
        if (Array.isArray(data.schools)) setSchools(data.schools);
        setSchoolChoice((current) => current ?? data.defaultSchoolId ?? SCHOOL_NONE);
      })
      .catch(() => {
        if (!cancelled) setCampaignOptionsError("The campaign list could not load. You can still give without choosing one.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A new campaign starts from its defaults: every one of its students picked,
  // and, for a campaign that has students, the recommendation set to Yes.
  const campaignKey = selectedCampaign?.slug ?? "";
  useEffect(() => {
    if (!selectedCampaign) {
      setSelectedStudentIds([]);
      return;
    }
    setSelectedStudentIds(selectedCampaign.students.map((s) => s.id));
    if (selectedCampaign.students.length > 0 && !selectedCampaign.isSchoolLevel) setDesignateStudent(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the campaign itself changes
  }, [campaignKey, selectedCampaign?.students.length]);

  const campaignHasStudents = Boolean(selectedCampaign && !selectedCampaign.isSchoolLevel && selectedCampaign.students.length > 0);
  // Through a campaign, the campaign decides who can be recommended; there is
  // nothing to ask on a school-level campaign or one with no students.
  const askAboutStudents = !isBusiness && (selectedCampaign ? campaignHasStudents : true);
  const recommendedStudentIds = designateStudent && campaignHasStudents ? selectedStudentIds : [];
  const needsRelationshipAck = recommendedStudentIds.length > 0;

  const programLabel = CORPORATE_PROGRAMS.find((p) => p.value === program)?.label ?? "Not chosen";
  const recommendationSummary = isBusiness
    ? schoolChoice && schoolChoice !== SCHOOL_NONE
      ? `School: ${schools.find((s) => s.id === schoolChoice)?.name ?? "Selected school"}`
      : "No school preference"
    : recommendedStudentIds.length > 0 && selectedCampaign
      ? selectedCampaign.students
          .filter((s) => recommendedStudentIds.includes(s.id))
          .map((s) => [s.firstName, s.lastName].filter(Boolean).join(" "))
          .join(", ")
      : "No student recommendation";

  useEffect(() => {
    if (step !== 4) return;
    setPaymentError(null);
    setPaypalConfigError(null);
    donationIdRef.current = null;
    createOrderErrorRef.current = null;

    fetch("/api/paypal/config")
      .then((res) => res.json() as Promise<PaypalConfig & { error?: string }>)
      .then((data) => {
        if (data.error) setPaypalConfigError(data.error);
        else setPaypalConfig(data);
      })
      .catch(() => setPaypalConfigError("Failed to load payment options. Please try again."));
  }, [createOrderErrorRef, donationIdRef, step]);

  function addStoRow() {
    setStoRows((r) => [
      ...r,
      { id: crypto.randomUUID(), organization: "", amount: 0 },
    ]);
  }

  function removeStoRow(id: string) {
    setStoRows((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== id)));
  }

  // The campaign the gift counts toward. Through a campaign's own page that is
  // always the campaign, whatever the donor answers about students; on the
  // general donation page a campaign is chosen only to recommend its students.
  const attributedCampaign = initialCampaignSlug || designateStudent ? selectedCampaign : null;

  function createOrderPayload() {
    if (isBusiness) {
      return {
        amount: donationAmount.toFixed(2),
        donationType: "business",
        campaignId: attributedCampaign?.campaignId ?? null,
        campaignSlug: attributedCampaign?.slug ?? null,
        campaignTitle: attributedCampaign?.title ?? null,
        anonymous: false,
        business: {
          businessName,
          ein,
          contactFirstName: firstName,
          contactLastName: lastName,
          contactTitle,
          email,
          phone,
          addressLine1: billingAddress,
          addressLine2: unit,
          city,
          state,
          zip,
          taxYear,
          program,
          schoolId: schoolChoice && schoolChoice !== SCHOOL_NONE ? schoolChoice : null,
          adorPreApproval,
          termsAccepted: terms,
          privacyConsent: gdpr,
          smsConsent,
        },
      };
    }
    return {
      amount: donationAmount.toFixed(2),
      donationType: "tax_credit",
      campaignId: attributedCampaign?.campaignId ?? null,
      campaignSlug: attributedCampaign?.slug ?? null,
      campaignTitle: attributedCampaign?.title ?? null,
      anonymous: false,
      taxCredit: {
        donorFirstName: firstName,
        donorMiddleName: middleName,
        donorLastName: lastName,
        donorEmail: email,
        donorPhone: phone,
        billingAddressLine1: billingAddress,
        billingAddressLine2: unit,
        billingCity: city,
        billingState: state,
        billingZip: zip,
        taxYear,
        filingStatus: filing,
        // NO clears the students here and again on the server.
        designateStudent: recommendedStudentIds.length > 0,
        campaignId: attributedCampaign?.campaignId ?? null,
        campaignSlug: attributedCampaign?.slug ?? null,
        campaignTitle: attributedCampaign?.title ?? null,
        recommendedStudentIds,
        relationshipAck: needsRelationshipAck && relationshipAck,
        termsAccepted: terms,
        privacyConsent: gdpr,
        smsConsent,
        creditLimit: maxForSelection,
        eligibleCredit: summary.eligibleCredit,
        previousStoTotal: otherStoTotal,
        priorActDonationsThisYear,
      },
    };
  }

  /** Step 2 to 3. Catches the relationship box here, not at PayPal two steps later. */
  function continueFromTaxes() {
    if (isBusiness) {
      if (!program) {
        setProgramError("Choose the program your gift supports.");
        document.getElementById("corp-program")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setProgramError(null);
      setStep(3);
      return;
    }
    if (needsRelationshipAck && !relationshipAck) {
      setRelationshipAckError(
        "Check the relationship policy to recommend these students, or choose No above.",
      );
      document.getElementById("rel-ack")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setRelationshipAckError(null);
    setStep(3);
  }

  /** Step 1 to 2. The corporate form needs the business's legal name and EIN. */
  const [businessError, setBusinessError] = useState<string | null>(null);
  function continueFromDonor() {
    if (isBusiness) {
      if (!businessName.trim() || ein.replace(/\D/g, "").length !== 9) {
        setBusinessError("Enter the business's legal name and its 9-digit EIN.");
        return;
      }
      setBusinessError(null);
    }
    setStep(2);
  }

  function toggleStudent(id: string, on: boolean) {
    setSelectedStudentIds((ids) => (on ? Array.from(new Set([...ids, id])) : ids.filter((x) => x !== id)));
  }

  const campaignSelectValue = campaignSlug || CAMP_NONE;

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
              {isBusiness ? "Corporate Tax Credit Donation" : "Tax Credit Donation"}
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
          title={isBusiness ? "Business" : "Donors"}
          description={
            isBusiness
              ? "The business making this Arizona corporate tax-credit gift, and who we should contact."
              : "Enter the billing contact for this Arizona tax-credit donation."
          }
          footerLayout="end"
          embedInDialog={embedInDialog}
          stepBannerLabel={embedInDialog ? (isBusiness ? "Business Information" : "Donor Information") : undefined}
          footer={
            embedInDialog ? (
              <Button type="button" onClick={continueFromDonor} className="gap-1">
                Next
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button type="button" onClick={continueFromDonor}>
                Continue
              </Button>
            )
          }
        >
          <div className={cn("space-y-6", embedInDialog && "sm:space-y-7")}>
            {prefilledFromAccount ? (
              <p className="text-sm text-muted-foreground">
                Pulled from your account. Check these details before you continue — changes here apply to this
                donation and its receipt only.
              </p>
            ) : embedInDialog ? (
              <p className="text-sm text-muted-foreground">
                {isBusiness ? "Enter your business information below." : "Enter your personal information below."}
              </p>
            ) : null}
            {isBusiness ? (
              <div className={cn("grid gap-4 sm:grid-cols-12", embedInDialog && "sm:gap-x-6 sm:gap-y-3")}>
                <FormField label="Legal business name" htmlFor="biz-name" className="sm:col-span-8">
                  <Input id="biz-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </FormField>
                <FormField label="EIN" htmlFor="biz-ein" className="sm:col-span-4">
                  <Input
                    id="biz-ein"
                    inputMode="numeric"
                    placeholder="12-3456789"
                    value={ein}
                    onChange={(e) => setEin(e.target.value)}
                  />
                </FormField>
                {businessError ? (
                  <p role="alert" className="text-sm text-destructive sm:col-span-12">
                    {businessError}
                  </p>
                ) : null}
              </div>
            ) : null}
            {isBusiness ? <p className="text-sm font-medium text-foreground">Contact person</p> : null}
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
              {isBusiness ? (
                <FormField label="Title (optional)" htmlFor="biz-title" className="sm:col-span-12">
                  <Input
                    id="biz-title"
                    placeholder="e.g. Controller"
                    value={contactTitle}
                    onChange={(e) => setContactTitle(e.target.value)}
                  />
                </FormField>
              ) : null}
            </div>
            <div
              className={cn(
                "grid gap-4 sm:grid-cols-12",
                embedInDialog && "sm:gap-x-6 sm:gap-y-3"
              )}
            >
              <FormField label={isBusiness ? "Business address" : "Billing address"} htmlFor="addr" className="sm:col-span-8">
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
            <SmsConsentCheckbox
              id="tax-credit-sms-consent"
              checked={smsConsent}
              onCheckedChange={setSmsConsent}
              copyKey="universal"
            />
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
                <Button type="button" onClick={continueFromTaxes} className="gap-1">
                  Next
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" onClick={continueFromTaxes}>
                  Continue
                </Button>
              </>
            )
          }
        >
          <div className="space-y-8">
            {isBusiness ? (
              <CorporateProgramPanel
                program={program}
                onProgram={(value) => {
                  setProgram(value);
                  setProgramError(null);
                }}
                programError={programError}
                schools={schools}
                schoolChoice={schoolChoice ?? SCHOOL_NONE}
                onSchoolChoice={setSchoolChoice}
                campaignTitle={attributedCampaign?.title ?? null}
                taxYear={taxYear}
                offeredTaxYears={offeredTaxYears}
                onTaxYear={setTaxYear}
                donationRaw={donationRaw}
                onDonationRaw={setDonationRaw}
                adorPreApproval={adorPreApproval}
                onAdorPreApproval={setAdorPreApproval}
                relaxed={embedInDialog}
              />
            ) : (
            <>
            {selectedCampaign && !campaignHasStudents && initialCampaignSlug ? (
              <p className="rounded-lg bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground ring-1 ring-border/60">
                {selectedCampaign.isSchoolLevel
                  ? `Your gift supports students at ${selectedCampaign.schoolName || "this school"}. Our team awards it to eligible students there.`
                  : "Your gift supports this campaign. Our team awards it to eligible students."}
              </p>
            ) : null}

            {askAboutStudents ? (
            <div className="space-y-3">
              <ChoiceLegend>
                {campaignHasStudents && initialCampaignSlug
                  ? `Would you like to recommend ${selectedCampaign!.students.length === 1 ? "this campaign's student" : "this campaign's students"} for your gift?`
                  : "Would you like to recommend students through one of our campaigns?"}
              </ChoiceLegend>
              <TogglePair
                value={designateStudent}
                onChange={(v) => {
                  setDesignateStudent(v);
                  // Back to Yes starts from the defaults again: every student picked.
                  if (v && selectedCampaign) setSelectedStudentIds(selectedCampaign.students.map((s) => s.id));
                  if (!v) setRelationshipAckError(null);
                }}
                left
                right={false}
                leftLabel="Yes"
                rightLabel="No"
                relaxed={embedInDialog}
              />
              <p className="text-xs text-muted-foreground">
                A recommendation is not binding. Our team decides every award under Arizona law, and your gift
                {attributedCampaign ? " still counts toward this campaign" : " is received"} either way.
              </p>
            </div>
            ) : null}

            {askAboutStudents && designateStudent && (
              <Card size="sm" className="bg-muted/20 shadow-none ring-1 ring-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recommended students</CardTitle>
                  <CardDescription>
                    {initialCampaignSlug
                      ? "Every student on this campaign is selected. Uncheck anyone you don't want to recommend."
                      : "Choose a campaign, then the students you'd like to recommend."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!initialCampaignSlug ? (
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
                          {campaignOptions
                            .filter((c) => !c.isSchoolLevel && c.students.length > 0)
                            .map((c) => (
                              <SelectItem key={c.slug} value={c.slug}>
                                {c.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {campaignOptionsError ? (
                        <p className="text-xs text-muted-foreground">{campaignOptionsError}</p>
                      ) : null}
                    </FormField>
                  ) : null}
                  {campaignHasStudents ? (
                    <fieldset className="space-y-2">
                      <legend className="sr-only">Students</legend>
                      {selectedCampaign!.students.map((student) => {
                        const checked = selectedStudentIds.includes(student.id);
                        return (
                          <label
                            key={student.id}
                            htmlFor={`rec-${student.id}`}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm",
                              checked ? "border-primary/50 bg-primary/5" : "border-border/60 bg-background",
                            )}
                          >
                            <Checkbox
                              id={`rec-${student.id}`}
                              checked={checked}
                              onCheckedChange={(v) => toggleStudent(student.id, v === true)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="font-medium text-foreground">
                                {[student.firstName, student.lastName].filter(Boolean).join(" ")}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {[student.grade, student.schoolName].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                      {selectedStudentIds.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No students selected, so your gift will count toward the campaign without a student
                          recommendation.
                        </p>
                      ) : null}
                    </fieldset>
                  ) : null}
                  {needsRelationshipAck ? (
                    <CheckField
                      id="rel-ack"
                      checked={relationshipAck}
                      onCheckedChange={(v) => {
                        setRelationshipAck(v);
                        if (v) setRelationshipAckError(null);
                      }}
                      error={relationshipAckError}
                    >
                      Relationship policy: I understand that I may not designate or direct this
                      donation to benefit my own dependent or family member.
                    </CheckField>
                  ) : null}
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <ChoiceLegend>Tax year {taxYear}</ChoiceLegend>
                <span className="text-muted-foreground">
                  Single {formatCheckoutUsd(yearLimits.single.combined)} · Married{" "}
                  {formatCheckoutUsd(yearLimits.married.combined)}
                </span>
              </div>
              {/* The prior year is offered only until April 15; see donationTaxYears. */}
              {offeredTaxYears.length > 1 ? (
                <TogglePair
                  value={taxYear === offeredTaxYears[1]}
                  onChange={(v) => setTaxYear(v ? offeredTaxYears[1] : offeredTaxYears[0])}
                  left
                  right={false}
                  leftLabel={`${offeredTaxYears[1]} tax year`}
                  rightLabel={`${offeredTaxYears[0]} tax year`}
                  relaxed={embedInDialog}
                />
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Annual credit limit — Single{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCheckoutUsd(yearLimits.single.combined)}
                </span>{" "}
                · Married{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCheckoutUsd(yearLimits.married.combined)}
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
                      setDonationRaw(String(getMaxForYearAndFiling(taxYear, "married", taxLimits)))
                    }
                  >
                    {formatCheckoutUsd(getMaxForYearAndFiling(taxYear, "married", taxLimits))}
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
            </>
            )}
          </div>
        </WizardShell>
      )}

      {step === 3 && (
        <WizardShell
          step={3}
          title="Billing Address"
          description="The address for this gift's receipt and payment."
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
                    {isBusiness ? businessName : `${firstName} ${lastName}`}
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
                  {isBusiness ? (
                    <div className="mt-2 flex justify-between text-act-action">
                      <span className="font-semibold">Program</span>
                      <span className="font-semibold">{programLabel}</span>
                    </div>
                  ) : (
                  <>
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
                  </>
                  )}
                </div>
              </div>
            ) : null}

            {!embedInDialog ? (
              <p className="text-sm text-muted-foreground">
                You&apos;ll pay with PayPal, or a debit or credit card through PayPal, after reviewing your gift on the
                next step.
              </p>
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
                  {isBusiness ? (
                    <>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Business</span>
                        <span className="text-right font-medium text-foreground">{businessName}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">EIN</span>
                        <span className="text-right font-medium tabular-nums text-foreground">{ein}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{isBusiness ? "Contact first name" : "First Name"}</span>
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

              <div className="flex justify-between gap-4 border-b border-border/60 py-2">
                <span className="text-muted-foreground">Recommendation (non-binding)</span>
                <span className="max-w-[60%] text-right font-medium text-foreground">{recommendationSummary}</span>
              </div>

              {isBusiness ? (
                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-4">
                  <p className="text-xs font-semibold tracking-wide text-primary uppercase">Corporate Tax Credit</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Program</span>
                    <span className="max-w-[60%] text-right font-medium">{programLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax Year</span>
                    <span className="font-medium tabular-nums">{taxYear}</span>
                  </div>
                  {adorPreApproval ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ADOR pre-approval</span>
                      <span className="font-medium">{adorPreApproval}</span>
                    </div>
                  ) : null}
                </div>
              ) : (
              <>
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

              <TaxCreditLimitsSummaryCard taxYear={taxYear} filing={filing} taxLimits={taxLimits} />
              </>
              )}

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

              <>
                  <p className="text-center text-sm font-medium text-foreground">
                    Complete your {formatCheckoutUsd(donationAmount)} donation via PayPal
                  </p>
                  {paymentError ? (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {paymentError}
                    </p>
                  ) : null}
                  {taxPaymentComplete ? (
                    <div className="rounded-lg border border-act-action/30 bg-act-action/10 p-4 text-center text-sm text-act-action">
                      Thank you. Your gift has been received and your receipt is on its way by email. Our team awards gifts to eligible students, so a campaign&apos;s progress bar moves once your gift is awarded.
                    </div>
                  ) : paypalConfigError ? (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {paypalConfigError}
                    </p>
                  ) : paypalConfig ? (
                    <PayPalScriptProvider
                      options={{
                        clientId: paypalConfig.clientId,
                        currency: "USD",
                        intent: "capture",
                        components: "buttons",
                      }}
                    >
                      <PayPalButtons
                        style={{ layout: "vertical", shape: "rect", label: "donate" }}
                        disabled={!terms || !gdpr || donationAmount <= 0}
                        createOrder={async () => {
                          setPaymentError(null);
                          createOrderErrorRef.current = null;
                          const res = await fetch("/api/paypal/create-order", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(createOrderPayload()),
                          });
                          const data = (await res.json()) as {
                            orderId?: string;
                            donationId?: string;
                            error?: string;
                          };
                          if (!res.ok || data.error || !data.orderId) {
                            const msg = data.error ?? "Failed to create tax credit donation order.";
                            createOrderErrorRef.current = msg;
                            setPaymentError(msg);
                            throw new Error(msg);
                          }
                          donationIdRef.current = data.donationId ?? null;
                          return data.orderId;
                        }}
                        onApprove={async (data) => {
                          const res = await fetch("/api/paypal/capture-order", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              orderId: data.orderID,
                              donationId: donationIdRef.current,
                            }),
                          });
                          const json = (await res.json()) as { ok?: boolean; error?: string };
                          if (!res.ok || json.error) {
                            setPaymentError(json.error ?? "Payment capture failed. Please contact us.");
                            return;
                          }
                          setTaxPaymentComplete(true);
                          onExitFlow?.();
                        }}
                        onCancel={async (data) => {
                          await fetch("/api/paypal/cancel-order", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              orderId: data.orderID,
                              donationId: donationIdRef.current,
                            }),
                          }).catch(() => undefined);
                          setPaymentError("Payment was cancelled before completion.");
                        }}
                        onError={() => {
                          setPaymentError(
                            createOrderErrorRef.current ?? "Payment was cancelled or failed. Please try again."
                          );
                          createOrderErrorRef.current = null;
                        }}
                      />
                    </PayPalScriptProvider>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">
                      Loading payment options…
                    </p>
                  )}
                  <p className="text-center text-[10px] text-muted-foreground">
                    Payments processed securely by PayPal.
                  </p>
                </>
              
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              <Card size="sm" className="shadow-none ring-1 ring-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{isBusiness ? "Business" : "Donor"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-muted-foreground">
                  {isBusiness ? (
                    <>
                      <div className="flex justify-between gap-4">
                        <span>Business</span>
                        <span className="text-right text-foreground">{businessName}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>EIN</span>
                        <span className="text-right tabular-nums text-foreground">{ein}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <span>{isBusiness ? "Contact" : "Name"}</span>
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
                  <CardTitle className="text-base">Recommendation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-muted-foreground">
                  <p className="text-foreground">{recommendationSummary}</p>
                  {attributedCampaign ? <p>Counts toward: {attributedCampaign.title}</p> : null}
                  <p className="text-xs">Recommendations are not binding; our team decides every award.</p>
                </CardContent>
              </Card>

              {isBusiness ? (
                <Card size="sm" className="shadow-none ring-1 ring-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Corporate tax credit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-muted-foreground">
                    <div className="flex justify-between gap-4">
                      <span>Program</span>
                      <span className="text-right text-foreground">{programLabel}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Gift</span>
                      <span className="tabular-nums text-foreground">{formatCheckoutUsd(donationAmount)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Tax year</span>
                      <span className="tabular-nums text-foreground">{taxYear}</span>
                    </div>
                    {adorPreApproval ? (
                      <div className="flex justify-between gap-4">
                        <span>ADOR pre-approval</span>
                        <span className="text-foreground">{adorPreApproval}</span>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : (
              <>
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

              <TaxCreditLimitsSummaryCard taxYear={taxYear} filing={filing} taxLimits={taxLimits} />
              </>
              )}

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

              <div className="space-y-3">
                <p className="text-center text-sm font-medium text-foreground">
                  Complete your {formatCheckoutUsd(donationAmount)} donation via PayPal
                </p>
                {paymentError ? (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {paymentError}
                  </p>
                ) : null}
                {taxPaymentComplete ? (
                  <div className="rounded-lg border border-act-action/30 bg-act-action/10 p-4 text-center text-sm text-act-action">
                    Thank you. Your gift has been received and your receipt is on its way by email. Our team awards gifts to eligible students, so a campaign&apos;s progress bar moves once your gift is awarded.
                  </div>
                ) : paypalConfigError ? (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {paypalConfigError}
                  </p>
                ) : paypalConfig ? (
                  <PayPalScriptProvider
                    options={{
                      clientId: paypalConfig.clientId,
                      currency: "USD",
                      intent: "capture",
                      components: "buttons",
                    }}
                  >
                    <PayPalButtons
                      style={{ layout: "vertical", shape: "rect", label: "donate" }}
                      disabled={!terms || !gdpr || donationAmount <= 0}
                      createOrder={async () => {
                        setPaymentError(null);
                        createOrderErrorRef.current = null;
                        const res = await fetch("/api/paypal/create-order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(createOrderPayload()),
                        });
                        const data = (await res.json()) as {
                          orderId?: string;
                          donationId?: string;
                          error?: string;
                        };
                        if (!res.ok || data.error || !data.orderId) {
                          const msg = data.error ?? "Failed to create tax credit donation order.";
                          createOrderErrorRef.current = msg;
                          setPaymentError(msg);
                          throw new Error(msg);
                        }
                        donationIdRef.current = data.donationId ?? null;
                        return data.orderId;
                      }}
                      onApprove={async (data) => {
                        const res = await fetch("/api/paypal/capture-order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            orderId: data.orderID,
                            donationId: donationIdRef.current,
                          }),
                        });
                        const json = (await res.json()) as { ok?: boolean; error?: string };
                        if (!res.ok || json.error) {
                          setPaymentError(json.error ?? "Payment capture failed. Please contact us.");
                          return;
                        }
                        setTaxPaymentComplete(true);
                        onExitFlow?.();
                      }}
                      onCancel={async (data) => {
                        await fetch("/api/paypal/cancel-order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            orderId: data.orderID,
                            donationId: donationIdRef.current,
                          }),
                        }).catch(() => undefined);
                        setPaymentError("Payment was cancelled before completion.");
                      }}
                      onError={() => {
                        setPaymentError(
                          createOrderErrorRef.current ?? "Payment was cancelled or failed. Please try again."
                        );
                        createOrderErrorRef.current = null;
                      }}
                    />
                  </PayPalScriptProvider>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    Loading payment options…
                  </p>
                )}
                <p className="text-center text-[10px] text-muted-foreground">
                  Payments processed securely by PayPal.
                </p>
              </div>
            </div>
          )}
        </WizardShell>
      )}
    </div>
  );
}
