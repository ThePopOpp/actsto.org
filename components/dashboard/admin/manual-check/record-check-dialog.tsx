"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CHECK_FILING_STATUSES,
  fundsForDonorType,
  LARGE_GIFT_CONFIRM_USD,
  normalizeManualCheck,
  parseUsd,
  RELATIONSHIP_ACK_METHODS,
  splitRemaining,
  taxYearChoice,
} from "@/lib/donations/manual-check-rules";
import { RELATIONSHIP_ACK_TEXT } from "@/lib/donations/recommendations";
import { OFFLINE_PAYMENT_METHODS, PAYMENT_METHOD_LABEL, checkNumberRequired } from "@/lib/donations/payment-methods";
import { FUNDING_SOURCE_LABEL, isFundingSource, splitIndividualGift } from "@/lib/funding-sources";
import { getOriginalOverflowForYear, type TaxCreditLimitConfig } from "@/lib/tax-credit";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type SplitRow = { fundingSource: string; amount: string };

type FormState = {
  donorType: "individual" | "business";
  linkUserId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  businessName: string;
  ein: string;
  contactFirstName: string;
  contactLastName: string;
  contactTitle: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
  amount: string;
  method: string;
  checkNumber: string;
  drawerName: string;
  checkDate: string;
  dateReceived: string;
  dateDeposited: string;
  internalNotes: string;
  splits: SplitRow[];
  campaignId: string;
  schoolId: string;
  studentIds: string[];
  relationshipAck: boolean;
  relationshipAckMethod: string;
  taxYear: string;
  taxYearConfirmed: boolean;
  taxYearConfirmation: string;
  filingStatus: string;
  otherStoGifts: string;
  showNamePublicly: boolean;
  emailReceipt: boolean;
};

type Options = {
  campaigns: {
    campaignId: string | null;
    title: string;
    schoolId: string | null;
    students: { id: string; firstName: string; lastName: string; grade: string }[];
  }[];
  schools: { id: string; name: string }[];
  defaultSchoolId: string | null;
};

type DonorHit = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  businessName: string;
  ein: string;
  contactTitle: string;
  filingStatus: string;
};

type EditMeta = {
  status: string;
  awardsCount: number;
  receipts: { id: string; receiptNumber: string; status: string; taxYear: number | null; voidReason: string | null }[];
  recordedByEmail: string | null;
  recordedAt: string;
};

type Saved = { donationId: string; receiptId?: string; receiptNumber?: string; emailed: boolean; warnings: string[]; reissued?: { voided: string | null; issued: string } | null };

const DRAFT_KEY = "actsto.manualCheckDraft";

function arizonaToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function blankForm(keep?: Partial<FormState>): FormState {
  return {
    donorType: "individual",
    linkUserId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    businessName: "",
    ein: "",
    contactFirstName: "",
    contactLastName: "",
    contactTitle: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "AZ",
    zip: "",
    email: "",
    phone: "",
    amount: "",
    method: "check",
    checkNumber: "",
    drawerName: "",
    checkDate: "",
    dateReceived: arizonaToday(),
    dateDeposited: "",
    internalNotes: "",
    splits: [{ fundingSource: "", amount: "" }],
    campaignId: "",
    schoolId: "",
    studentIds: [],
    relationshipAck: false,
    relationshipAckMethod: "",
    taxYear: "",
    taxYearConfirmed: false,
    taxYearConfirmation: "",
    filingStatus: "",
    otherStoGifts: "0",
    showNamePublicly: false,
    emailReceipt: true,
    ...keep,
  };
}

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

/** One split line takes the whole check, so the admin only picks the fund. */
function effectiveSplits(f: FormState): SplitRow[] {
  return f.splits.length === 1 ? [{ ...f.splits[0], amount: f.amount }] : f.splits;
}

function payload(f: FormState, extra: Record<string, unknown> = {}) {
  return {
    ...f,
    linkUserId: f.linkUserId || null,
    campaignId: f.campaignId || null,
    schoolId: f.schoolId || null,
    splits: effectiveSplits(f),
    taxYear: f.taxYear ? Number(f.taxYear) : null,
    relationshipAckMethod: f.relationshipAckMethod || null,
    filingStatus: f.filingStatus || null,
    ...extra,
  };
}

// ── Entry point ──────────────────────────────────────────────────────────────

/** "Record check donation": opens the form. Payments (primary) and Donors (shortcut). */
export function RecordCheckButton({
  size = "default",
  label = "Record check donation",
  onRecorded,
}: {
  size?: "default" | "sm";
  label?: string;
  onRecorded?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size={size} onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 size-4" /> {label}
      </Button>
      {open ? <CheckFormDialog mode="create" onClose={() => setOpen(false)} onSaved={onRecorded} /> : null}
    </>
  );
}

// ── The form ─────────────────────────────────────────────────────────────────

export function CheckFormDialog({
  mode,
  donationId,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  donationId?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => {
    if (mode === "create") {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) return { ...blankForm(), ...(JSON.parse(draft) as Partial<FormState>) };
      } catch {
        /* no storage: start blank */
      }
    }
    return blankForm();
  });
  const [taxYearTouched, setTaxYearTouched] = useState(mode === "edit");
  const [options, setOptions] = useState<Options | null>(null);
  const [limits, setLimits] = useState<TaxCreditLimitConfig | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [meta, setMeta] = useState<EditMeta | null>(null);
  const [reason, setReason] = useState("");
  const [needsReason, setNeedsReason] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [lastSaved, setLastSaved] = useState<Saved | null>(null);
  const [hadDraft] = useState(() => {
    try {
      return mode === "create" && Boolean(localStorage.getItem(DRAFT_KEY));
    } catch {
      return false;
    }
  });
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  useEffect(() => {
    fetch("/api/campaigns/donation-options", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Options) => setOptions(d))
      .catch(() => setOptions({ campaigns: [], schools: [], defaultSchoolId: null }));
    fetch("/api/tax-credit-limits")
      .then((r) => r.json())
      .then((d: { limits?: TaxCreditLimitConfig }) => setLimits(d.limits ?? null))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !donationId) return;
    fetch(`/api/admin/donations/manual/${donationId}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error ?? "Could not load the check.");
        setForm({ ...blankForm(), ...d.form, splits: d.form.splits.length ? d.form.splits : [{ fundingSource: "", amount: "" }] });
        setMeta({ status: d.status, awardsCount: d.awardsCount, receipts: d.receipts, recordedByEmail: d.recordedByEmail, recordedAt: d.recordedAt });
      })
      .catch((e: Error) => setError({ message: e.message }))
      .finally(() => setLoading(false));
  }, [mode, donationId]);

  // Keep a draft of a new entry so nothing typed is lost (spec 9).
  useEffect(() => {
    if (mode !== "create" || saved) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* storage blocked: the form still works */
    }
  }, [form, mode, saved]);

  // Tax year follows the dates until the admin picks one.
  const choice = useMemo(() => taxYearChoice(form.checkDate || null, form.dateReceived || null), [form.checkDate, form.dateReceived]);
  useEffect(() => {
    if (taxYearTouched) return;
    if (choice.choiceRequired) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((f) => ({ ...f, taxYear: "", taxYearConfirmed: false }));
    } else if (choice.defaultYear) {
      setForm((f) => ({ ...f, taxYear: String(choice.defaultYear), taxYearConfirmed: false }));
    }
  }, [choice, taxYearTouched]);

  const isBusiness = form.donorType === "business";
  const funds = fundsForDonorType(form.donorType);
  const total = parseUsd(form.amount) ?? 0;
  const remaining = splitRemaining(total, effectiveSplits(form));
  const campaign = options?.campaigns.find((c) => c.campaignId === form.campaignId) ?? null;
  const students = isBusiness ? [] : campaign?.students ?? [];

  function switchDonorType(next: "individual" | "business") {
    setForm((f) => ({
      ...f,
      donorType: next,
      splits: [{ fundingSource: "", amount: "" }],
      studentIds: [],
      relationshipAck: false,
      relationshipAckMethod: "",
      filingStatus: next === "business" ? "" : f.filingStatus,
      schoolId: next === "business" ? f.schoolId || options?.defaultSchoolId || "" : f.schoolId,
    }));
  }

  function suggestSplit() {
    if (!limits || !total) return;
    const year = form.taxYear || String(choice.defaultYear ?? new Date().getFullYear());
    const filing = form.filingStatus === "married" ? "married" : "single";
    const l = getOriginalOverflowForYear(year, limits)[filing];
    const parts = splitIndividualGift(total, l.original, parseUsd(form.otherStoGifts) ?? 0);
    if (parts.length) set("splits", parts.map((p) => ({ fundingSource: p.fundingSource, amount: p.amount.toFixed(2) })));
  }

  async function submit(again: boolean, confirm: { duplicate?: boolean; large?: boolean } = {}) {
    setError(null);
    setDuplicateWarning(null);
    const body = payload(form, {
      confirmDuplicate: Boolean(confirm.duplicate),
      confirmLargeAmount: Boolean(confirm.large) || mode === "edit",
      ...(mode === "edit" ? { reason } : {}),
    });

    // Same rules as the server, for instant feedback. The server decides.
    const check = normalizeManualCheck(body, arizonaToday());
    if (!check.ok) {
      if (check.needsConfirm === "large_amount") {
        if (window.confirm(`Record ${usd(total)}? That's over ${usd(LARGE_GIFT_CONFIRM_USD)}.`)) return submit(again, { ...confirm, large: true });
        return;
      }
      setError({ message: check.error, field: check.field });
      fieldRefs.current[check.field ?? ""]?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setBusy(true);
    const res = await fetch(mode === "create" ? "/api/admin/donations/manual" : `/api/admin/donations/manual/${donationId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as (Saved & { error?: string; field?: string; needsConfirm?: string; needsReason?: boolean }) | null;
    setBusy(false);

    if (!res.ok || !data) {
      if (data?.needsConfirm === "duplicate") {
        setDuplicateWarning(data.error ?? "This check number was already recorded for this donor.");
        return;
      }
      if (data?.needsReason) setNeedsReason(true);
      setError({ message: data?.error ?? "Not saved.", field: data?.field });
      return;
    }

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    router.refresh();
    onSaved?.();
    if (again) {
      // Batches arrive together: keep the dates and method, clear the rest.
      setForm(blankForm({ dateReceived: form.dateReceived, dateDeposited: form.dateDeposited, method: form.method }));
      setTaxYearTouched(false);
      setSaved(null);
      setLastSaved(data);
    } else {
      setSaved(data);
    }
  }

  const fieldError = (name: string) =>
    error?.field === name ? (
      <p role="alert" className="mt-1 text-xs text-destructive">
        {error.message}
      </p>
    ) : null;
  const ref = (name: string) => (el: HTMLElement | null) => {
    fieldRefs.current[name] = el;
  };

  // ── Done ──
  if (saved) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-primary">
              <CheckCircle2 className="size-5 text-emerald-600" /> {mode === "create" ? "Check recorded" : "Check updated"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "It's a paid donation now: it counts in every total and is available on Allocation under its funding source."
                : "Changes saved and logged."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {saved.receiptNumber || saved.reissued ? (
              <p>
                Receipt <span className="font-mono font-medium">{saved.reissued?.issued ?? saved.receiptNumber}</span>
                {saved.reissued?.voided ? (
                  <>
                    {" "}
                    replaces <span className="font-mono">{saved.reissued.voided}</span> (now void)
                  </>
                ) : null}
                {saved.emailed ? ", emailed to the donor." : ", generated. Send it from Receipts, or download and mail it."}
              </p>
            ) : null}
            {saved.warnings?.map((w) => (
              <p key={w} className="text-amber-700 dark:text-amber-400">
                {w}
              </p>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => {
                  onClose();
                  router.push(`/dashboard/admin/billing?method=offline#donation-${saved.donationId}`);
                }}>
                View on Payments
              </Button>
              {mode === "create" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setForm(blankForm({ dateReceived: form.dateReceived, dateDeposited: form.dateDeposited, method: form.method }));
                    setTaxYearTouched(false);
                    setSaved(null);
                  }}
                >
                  Record another
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const inputCls = "mt-1.5";
  const selectCls = "mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm";

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">{mode === "create" ? "Record check donation" : "Edit recorded check"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "For a check, cashier's check or money order that has been received. It's recorded as paid and treated exactly like an online gift."
              : meta
                ? `Recorded by ${meta.recordedByEmail ?? "staff"} on ${new Date(meta.recordedAt).toLocaleDateString("en-US", { timeZone: "America/Phoenix" })}. Every change is logged.`
                : "Loading…"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <form
            className="space-y-6 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(false);
            }}
          >
            {lastSaved ? (
              <Alert>
                <AlertDescription>
                  Saved the last check{lastSaved.receiptNumber ? ` (receipt ${lastSaved.receiptNumber})` : ""}. Ready for the next one.
                </AlertDescription>
              </Alert>
            ) : null}
            {hadDraft && mode === "create" && !lastSaved ? (
              <p className="text-xs text-muted-foreground">
                Restored your unsaved entry.{" "}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => {
                    setForm(blankForm());
                    setTaxYearTouched(false);
                  }}
                >
                  Start over
                </button>
              </p>
            ) : null}
            {meta && meta.awardsCount > 0 ? (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  {meta.awardsCount} award{meta.awardsCount === 1 ? "" : "s"} draw on this check, so its amount and funds can&apos;t change until they&apos;re reversed on Allocation.
                </AlertDescription>
              </Alert>
            ) : null}

            {/* ── Donor ── */}
            <fieldset className="space-y-3">
              <legend className="font-heading text-base font-semibold text-primary">Donor</legend>
              <div className="flex gap-2" ref={ref("donorType")}>
                {(["individual", "business"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={mode === "edit"}
                    onClick={() => switchDonorType(t)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-60",
                      form.donorType === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t === "individual" ? "Individual" : "Business"}
                  </button>
                ))}
              </div>

              <DonorLookup
                linkedId={form.linkUserId}
                onPick={(hit) =>
                  setForm((f) => ({
                    ...f,
                    linkUserId: hit?.id ?? "",
                    ...(hit
                      ? {
                          email: f.email || hit.email,
                          phone: f.phone || hit.phone,
                          addressLine1: f.addressLine1 || hit.addressLine1,
                          addressLine2: f.addressLine2 || hit.addressLine2,
                          city: f.city || hit.city,
                          state: f.addressLine1 ? f.state : hit.state || f.state,
                          zip: f.zip || hit.zip,
                          ...(f.donorType === "individual"
                            ? {
                                firstName: f.firstName || hit.firstName,
                                middleName: f.middleName || hit.middleName,
                                lastName: f.lastName || hit.lastName,
                                filingStatus: f.filingStatus || hit.filingStatus,
                              }
                            : {
                                businessName: f.businessName || hit.businessName,
                                ein: f.ein || hit.ein,
                                contactFirstName: f.contactFirstName || hit.firstName,
                                contactLastName: f.contactLastName || hit.lastName,
                                contactTitle: f.contactTitle || hit.contactTitle,
                              }),
                        }
                      : {}),
                  }))
                }
              />

              {isBusiness ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div ref={ref("businessName")} className="sm:col-span-2">
                    <Label htmlFor="mc-bn">Legal business name *</Label>
                    <Input id="mc-bn" className={inputCls} value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
                    {fieldError("businessName")}
                  </div>
                  <div ref={ref("ein")}>
                    <Label htmlFor="mc-ein">EIN *</Label>
                    <Input id="mc-ein" className={inputCls} placeholder="12-3456789" value={form.ein} onChange={(e) => set("ein", e.target.value)} />
                    {fieldError("ein")}
                  </div>
                  <div>
                    <Label htmlFor="mc-ct">Contact title</Label>
                    <Input id="mc-ct" className={inputCls} value={form.contactTitle} onChange={(e) => set("contactTitle", e.target.value)} />
                  </div>
                  <div ref={ref("contactFirstName")}>
                    <Label htmlFor="mc-cf">Contact first name *</Label>
                    <Input id="mc-cf" className={inputCls} value={form.contactFirstName} onChange={(e) => set("contactFirstName", e.target.value)} />
                    {fieldError("contactFirstName")}
                  </div>
                  <div>
                    <Label htmlFor="mc-cl">Contact last name *</Label>
                    <Input id="mc-cl" className={inputCls} value={form.contactLastName} onChange={(e) => set("contactLastName", e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3" ref={ref("firstName")}>
                  <div>
                    <Label htmlFor="mc-fn">First name *</Label>
                    <Input id="mc-fn" className={inputCls} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="mc-mn">Middle name</Label>
                    <Input id="mc-mn" className={inputCls} value={form.middleName} onChange={(e) => set("middleName", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="mc-ln">Last name *</Label>
                    <Input id="mc-ln" className={inputCls} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
                  </div>
                  <div className="sm:col-span-3">{fieldError("firstName")}</div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-6" ref={ref("addressLine1")}>
                <div className="sm:col-span-4">
                  <Label htmlFor="mc-a1">Street address *</Label>
                  <Input id="mc-a1" className={inputCls} value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="mc-a2">Unit</Label>
                  <Input id="mc-a2" className={inputCls} value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor="mc-city">City *</Label>
                  <Input id="mc-city" className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
                <div className="sm:col-span-1">
                  <Label htmlFor="mc-st">State *</Label>
                  <Input id="mc-st" className={inputCls} maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
                </div>
                <div className="sm:col-span-2" ref={ref("zip")}>
                  <Label htmlFor="mc-zip">ZIP *</Label>
                  <Input id="mc-zip" className={inputCls} inputMode="numeric" value={form.zip} onChange={(e) => set("zip", e.target.value)} />
                </div>
                <div className="sm:col-span-6">
                  {fieldError("addressLine1")}
                  {fieldError("zip")}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div ref={ref("email")}>
                  <Label htmlFor="mc-em">Email</Label>
                  <Input id="mc-em" type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} />
                  {fieldError("email")}
                  {!form.email ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Without an email the receipt can only be downloaded and mailed.</p> : null}
                </div>
                <div>
                  <Label htmlFor="mc-ph">Phone</Label>
                  <Input id="mc-ph" type="tel" className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  <p className="mt-1 text-xs text-muted-foreground">Not opted in to texts. SMS needs the donor&apos;s own consent.</p>
                </div>
              </div>
            </fieldset>

            {/* ── Gift ── */}
            <fieldset className="space-y-3">
              <legend className="font-heading text-base font-semibold text-primary">Gift</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <div ref={ref("amount")}>
                  <Label htmlFor="mc-amt">Amount *</Label>
                  <Input id="mc-amt" className={inputCls} inputMode="decimal" placeholder="0.00" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
                  {fieldError("amount")}
                </div>
                <div ref={ref("method")}>
                  <Label htmlFor="mc-method">Payment method *</Label>
                  <select id="mc-method" className={selectCls} value={form.method} onChange={(e) => set("method", e.target.value)}>
                    {OFFLINE_PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {PAYMENT_METHOD_LABEL[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <div ref={ref("checkNumber")}>
                  <Label htmlFor="mc-cn">
                    {form.method === "money_order" ? "Serial number" : "Check number *"}
                  </Label>
                  <Input id="mc-cn" className={inputCls} value={form.checkNumber} onChange={(e) => set("checkNumber", e.target.value)} />
                  {fieldError("checkNumber")}
                  {checkNumberRequired(form.method as "check") ? null : <p className="mt-1 text-xs text-muted-foreground">Optional for a money order.</p>}
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor="mc-drawer">Name on check, if different from the donor</Label>
                  <Input id="mc-drawer" className={inputCls} placeholder="Joint account, a business paying for its owner, a donor-advised fund…" value={form.drawerName} onChange={(e) => set("drawerName", e.target.value)} />
                </div>
                <div ref={ref("checkDate")}>
                  <Label htmlFor="mc-cd">Date on check</Label>
                  <Input id="mc-cd" type="date" className={inputCls} value={form.checkDate} onChange={(e) => set("checkDate", e.target.value)} />
                  {fieldError("checkDate")}
                </div>
                <div ref={ref("dateReceived")}>
                  <Label htmlFor="mc-dr">Date received *</Label>
                  <Input id="mc-dr" type="date" className={inputCls} max={arizonaToday()} value={form.dateReceived} onChange={(e) => set("dateReceived", e.target.value)} />
                  {fieldError("dateReceived")}
                </div>
                <div ref={ref("dateDeposited")}>
                  <Label htmlFor="mc-dd">Date deposited</Label>
                  <Input id="mc-dd" type="date" className={inputCls} value={form.dateDeposited} onChange={(e) => set("dateDeposited", e.target.value)} />
                  {fieldError("dateDeposited")}
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor="mc-notes">Internal notes</Label>
                  <Textarea id="mc-notes" className={inputCls} rows={2} placeholder="Staff only. Never on the receipt." value={form.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} />
                </div>
              </div>
              {mode === "create" ? (
                <p className="text-xs text-muted-foreground">
                  <FileText className="mr-1 inline size-3.5" />
                  You can attach a scan of the check after saving, from its row on Payments. Cover the account-number line first.
                </p>
              ) : null}
            </fieldset>

            {/* ── Tax credit and funds ── */}
            <fieldset className="space-y-3">
              <legend className="font-heading text-base font-semibold text-primary">Tax credit and funds</legend>

              <div ref={ref("taxYear")} className="space-y-2">
                <Label>Tax year *</Label>
                {choice.choiceRequired ? (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      This check is dated or received between Jan 1 and Apr 15, so the donor may claim it for either year. Confirm with the donor and choose one.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {choice.options.map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => {
                            setTaxYearTouched(true);
                            setForm((f) => ({ ...f, taxYear: String(y), taxYearConfirmed: true }));
                          }}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium",
                            form.taxYearConfirmed && form.taxYear === String(y) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                          )}
                        >
                          {y}
                          {y === choice.defaultYear ? " (year on check)" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <select
                    className={cn(selectCls, "sm:w-48")}
                    value={form.taxYear}
                    onChange={(e) => {
                      setTaxYearTouched(true);
                      setForm((f) => ({ ...f, taxYear: e.target.value, taxYearConfirmed: true }));
                    }}
                  >
                    <option value="">Enter a date first</option>
                    {choice.options.map((y) => (
                      <option key={y} value={y}>
                        {y}
                        {y === choice.defaultYear ? " (year on check)" : ""}
                      </option>
                    ))}
                  </select>
                )}
                <Input
                  className="sm:w-2/3"
                  placeholder="Confirmed with donor: who, how and when (e.g. phone call with Jane, 1/12)"
                  value={form.taxYearConfirmation}
                  onChange={(e) => set("taxYearConfirmation", e.target.value)}
                />
                {fieldError("taxYear")}
              </div>

              {!isBusiness ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div ref={ref("filingStatus")}>
                    <Label htmlFor="mc-fs">Filing status *</Label>
                    <select id="mc-fs" className={selectCls} value={form.filingStatus} onChange={(e) => set("filingStatus", e.target.value)}>
                      <option value="">Choose…</option>
                      {CHECK_FILING_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    {fieldError("filingStatus")}
                  </div>
                  <div>
                    <Label htmlFor="mc-oth">Gifts to other STOs this tax year</Label>
                    <Input id="mc-oth" className={inputCls} inputMode="decimal" value={form.otherStoGifts} onChange={(e) => set("otherStoGifts", e.target.value)} />
                    <p className="mt-1 text-xs text-muted-foreground">If the donor told us. Used for the receipt&apos;s credit breakdown.</p>
                  </div>
                </div>
              ) : null}

              <div ref={ref("splits")} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Funding source *</Label>
                  {!isBusiness && limits && total > 0 ? (
                    <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={suggestSplit}>
                      Suggest Original / Overflow split
                    </button>
                  ) : null}
                </div>
                {form.splits.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_8rem_auto] items-center gap-2">
                    <select
                      aria-label="Fund"
                      className="h-10 rounded-md border border-input bg-background px-2"
                      value={row.fundingSource}
                      onChange={(e) => set("splits", form.splits.map((r, j) => (j === i ? { ...r, fundingSource: e.target.value } : r)))}
                    >
                      <option value="">Choose a fund…</option>
                      {funds.map((s) => (
                        <option key={s} value={s}>
                          {FUNDING_SOURCE_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <Input
                      aria-label="Amount"
                      inputMode="decimal"
                      disabled={form.splits.length === 1}
                      value={form.splits.length === 1 ? form.amount : row.amount}
                      onChange={(e) => set("splits", form.splits.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={form.splits.length === 1}
                      onClick={() => set("splits", form.splits.filter((_, j) => j !== i))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      set("splits", [
                        ...(form.splits.length === 1 ? [{ ...form.splits[0], amount: form.amount }] : form.splits),
                        { fundingSource: "", amount: "" },
                      ])
                    }
                  >
                    Split across funds
                  </Button>
                  {form.splits.length > 1 ? (
                    <span className={cn("text-xs font-medium tabular-nums", Math.abs(remaining) < 0.005 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
                      {Math.abs(remaining) < 0.005 ? "Adds up to the check" : remaining > 0 ? `${usd(remaining)} left to assign` : `${usd(-remaining)} over the check`}
                    </span>
                  ) : null}
                </div>
                {fieldError("splits")}
                {form.splits.some((s) => isFundingSource(s.fundingSource) && s.fundingSource.startsWith("corporate")) ? (
                  <p className="text-xs text-muted-foreground">Corporate money can only be awarded to students who qualify for that program.</p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div ref={ref("campaignId")}>
                  <Label htmlFor="mc-camp">Campaign</Label>
                  <select
                    id="mc-camp"
                    className={selectCls}
                    disabled={mode === "edit"}
                    value={form.campaignId}
                    onChange={(e) => setForm((f) => ({ ...f, campaignId: e.target.value, studentIds: [], relationshipAck: false }))}
                  >
                    <option value="">None: general / unrestricted to ACT</option>
                    {options?.campaigns
                      .filter((c) => c.campaignId)
                      .map((c) => (
                        <option key={c.campaignId!} value={c.campaignId!}>
                          {c.title}
                        </option>
                      ))}
                  </select>
                  {fieldError("campaignId")}
                </div>
                <div ref={ref("schoolId")}>
                  <Label htmlFor="mc-school">Recommended school</Label>
                  <select id="mc-school" className={selectCls} value={form.schoolId} onChange={(e) => set("schoolId", e.target.value)}>
                    <option value="">No school recommendation</option>
                    {options?.schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {fieldError("schoolId")}
                </div>
              </div>

              {students.length ? (
                <div ref={ref("studentIds")} className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-xs font-medium">Recommended students (optional, from this campaign only)</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {students.map((s) => (
                      <label key={s.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.studentIds.includes(s.id)}
                          onChange={(e) =>
                            set("studentIds", e.target.checked ? [...form.studentIds, s.id] : form.studentIds.filter((id) => id !== s.id))
                          }
                        />
                        {s.firstName} {s.lastName}
                        {s.grade ? <span className="text-xs text-muted-foreground">· {s.grade}</span> : null}
                      </label>
                    ))}
                  </div>
                  {fieldError("studentIds")}
                </div>
              ) : null}

              {form.studentIds.length ? (
                <div ref={ref("relationshipAck")} className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" checked={form.relationshipAck} onChange={(e) => set("relationshipAck", e.target.checked)} />
                    <span>
                      The donor acknowledged: <em>{RELATIONSHIP_ACK_TEXT}</em>
                    </span>
                  </label>
                  <select className={cn(selectCls, "sm:w-2/3")} value={form.relationshipAckMethod} onChange={(e) => set("relationshipAckMethod", e.target.value)}>
                    <option value="">How was it given?</option>
                    {RELATIONSHIP_ACK_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Your name and the time are recorded as the attestation.</p>
                  {fieldError("relationshipAck")}
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground">
                Recommendations are non-binding. A.R.S. § 43-1603(C): scholarships must not be directed to benefit the donor&apos;s own dependents. Never tell a donor whether a recommended student received an award.
              </p>
            </fieldset>

            {/* ── Display and receipt ── */}
            <fieldset className="space-y-2">
              <legend className="font-heading text-base font-semibold text-primary">Display and receipt</legend>
              {form.campaignId ? (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.showNamePublicly} onChange={(e) => set("showNamePublicly", e.target.checked)} />
                  Show the donor&apos;s name on the campaign page (only if they asked; otherwise listed as Anonymous)
                </label>
              ) : null}
              <label className={cn("flex items-center gap-2", !form.email && "opacity-50")}>
                <input type="checkbox" disabled={!form.email} checked={form.emailReceipt && Boolean(form.email)} onChange={(e) => set("emailReceipt", e.target.checked)} />
                {mode === "create" ? "Email the receipt now" : "Email the receipt if it is re-issued"}
              </label>
            </fieldset>

            {mode === "edit" ? (
              <div className="space-y-1.5" ref={ref("reason")}>
                <Label htmlFor="mc-reason">Reason for change{needsReason ? " *" : ""}</Label>
                <Input
                  id="mc-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Required when the donor, amount, date, tax year, filing status or funds change"
                />
                <p className="text-xs text-muted-foreground">
                  Changing what the receipt shows voids the current receipt and issues a new number. Current:{" "}
                  {meta?.receipts.filter((r) => r.status !== "void").map((r) => r.receiptNumber).join(", ") || "none"}
                </p>
                {fieldError("reason")}
              </div>
            ) : null}

            {duplicateWarning ? (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertDescription className="space-y-2">
                  <p>{duplicateWarning}</p>
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void submit(false, { duplicate: true })}>
                    It&apos;s a different check. Save anyway
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {error && !error.field ? (
              <p role="alert" className="text-destructive">
                {error.message}
              </p>
            ) : null}
            {error?.field ? (
              <p role="alert" className="text-xs text-destructive">
                Fix the highlighted field: {error.message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : mode === "create" ? "Record check" : "Save changes"}
              </Button>
              {mode === "create" ? (
                <Button type="button" variant="outline" disabled={busy} onClick={() => void submit(true)}>
                  Save and record another
                </Button>
              ) : null}
              <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Donor lookup ─────────────────────────────────────────────────────────────

function DonorLookup({ linkedId, onPick }: { linkedId: string; onPick: (hit: DonorHit | null) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<DonorHit[]>([]);
  const [linked, setLinked] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/admin/donations/manual/donor-search?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { results?: DonorHit[] }) => setHits(d.results ?? []))
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  if (linkedId) {
    return (
      <p className="text-xs">
        Linked to account <span className="font-medium">{linked ?? "on file"}</span>.{" "}
        <button type="button" className="text-primary underline" onClick={() => { setLinked(null); onPick(null); }}>
          Unlink
        </button>
      </p>
    );
  }
  return (
    <div className="relative">
      <Label htmlFor="mc-lookup">Existing donor account (optional)</Label>
      <Input id="mc-lookup" className="mt-1.5" placeholder="Search by name or email to link and prefill" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.length ? (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-muted"
                onClick={() => {
                  setLinked(`${h.name} (${h.email})`);
                  setHits([]);
                  setQ("");
                  onPick(h);
                }}
              >
                <span className="font-medium">{h.name}</span> <span className="text-xs text-muted-foreground">{h.email}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
