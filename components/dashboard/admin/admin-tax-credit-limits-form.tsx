"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_TAX_CREDIT_LIMITS,
  type FilingStatus,
  type TaxCreditLimitConfig,
  type TaxYear,
} from "@/lib/tax-credit";

const TAX_YEARS: TaxYear[] = ["2026", "2025"];
const FILING_STATUSES: { id: FilingStatus; label: string }[] = [
  { id: "single", label: "Single / Head of Household" },
  { id: "married", label: "Married Filing Jointly" },
];

type SaveState = "idle" | "loading" | "saving" | "saved" | "error";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function numberValue(value: string) {
  return Number.parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
}

export function AdminTaxCreditLimitsForm() {
  const [limits, setLimits] = useState<TaxCreditLimitConfig>(DEFAULT_TAX_CREDIT_LIMITS);
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<SaveState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setState("loading");
      const res = await fetch("/api/admin/tax-credit-limits", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as {
        limits?: TaxCreditLimitConfig;
        metadata?: { sourceUrl?: string; notes?: string }[];
        error?: string;
      } | null;
      if (!mounted) return;
      if (!res.ok || !data?.limits) {
        setState("error");
        setMessage(data?.error ?? "Could not load tax credit limits.");
        return;
      }
      setLimits(data.limits);
      setSourceUrl(data.metadata?.find((row) => row.sourceUrl)?.sourceUrl ?? "");
      setNotes(data.metadata?.find((row) => row.notes)?.notes ?? "");
      setState("idle");
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  function patchLimit(year: TaxYear, filing: FilingStatus, key: "original" | "overflow" | "combined", value: string) {
    setLimits((current) => ({
      ...current,
      [year]: {
        ...current[year],
        [filing]: {
          ...current[year][filing],
          [key]: numberValue(value),
        },
      },
    }));
    setState("idle");
    setMessage("");
  }

  async function save() {
    setState("saving");
    setMessage("");
    const res = await fetch("/api/admin/tax-credit-limits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limits, sourceUrl, notes }),
    });
    const data = (await res.json().catch(() => null)) as { limits?: TaxCreditLimitConfig; error?: string } | null;
    if (!res.ok || !data?.limits) {
      setState("error");
      setMessage(data?.error ?? "Could not save tax credit limits.");
      return;
    }
    setLimits(data.limits);
    setState("saved");
    setMessage("Tax credit limits saved. Public pages and donation flows will use these values.");
    window.setTimeout(() => setState((current) => (current === "saved" ? "idle" : current)), 2600);
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-primary/25 bg-muted/15">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Update annual Arizona individual tax credit limits once here. The donation wizard, public
          site copy, footer/pre-footer defaults, and donor registration copy read from this shared
          source with safe code defaults if the database is unavailable.
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Tax Credit Limits</CardTitle>
          <CardDescription>
            Original + overflow must equal the combined annual maximum for each filing status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-8"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {TAX_YEARS.map((year) => (
              <section key={year} className="space-y-4 rounded-lg border border-border/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-primary">{year} Tax Year</h3>
                    <p className="text-sm text-muted-foreground">
                      Single {formatUsd(limits[year].single.combined)} · Married{" "}
                      {formatUsd(limits[year].married.combined)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {FILING_STATUSES.map((filing) => {
                    const row = limits[year][filing.id];
                    const mismatch = Math.round((row.original + row.overflow) * 100) !== Math.round(row.combined * 100);
                    return (
                      <div key={filing.id} className="rounded-lg border border-border/70 p-4">
                        <p className="text-sm font-semibold text-foreground">{filing.label}</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div>
                            <Label htmlFor={`${year}-${filing.id}-original`}>Original</Label>
                            <Input
                              id={`${year}-${filing.id}-original`}
                              className="mt-1.5"
                              inputMode="decimal"
                              value={row.original}
                              onChange={(event) => patchLimit(year, filing.id, "original", event.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${year}-${filing.id}-overflow`}>Overflow</Label>
                            <Input
                              id={`${year}-${filing.id}-overflow`}
                              className="mt-1.5"
                              inputMode="decimal"
                              value={row.overflow}
                              onChange={(event) => patchLimit(year, filing.id, "overflow", event.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${year}-${filing.id}-combined`}>Combined</Label>
                            <Input
                              id={`${year}-${filing.id}-combined`}
                              className="mt-1.5"
                              inputMode="decimal"
                              value={row.combined}
                              onChange={(event) => patchLimit(year, filing.id, "combined", event.target.value)}
                            />
                          </div>
                        </div>
                        {mismatch ? (
                          <p className="mt-2 text-xs text-destructive">
                            Original plus overflow must equal the combined limit.
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tax-source">Source URL</Label>
                <Input
                  id="tax-source"
                  className="mt-1.5 font-mono text-sm"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://azdor.gov/..."
                />
              </div>
              <div>
                <Label htmlFor="tax-notes">Internal notes</Label>
                <Textarea
                  id="tax-notes"
                  className="mt-1.5 min-h-10"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Reviewed with AZ DOR guidance..."
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <Button type="submit" disabled={state === "saving" || state === "loading"}>
                {state === "saving" ? "Saving..." : "Save Tax Credit Limits"}
              </Button>
              {message ? (
                <span className={state === "error" ? "text-sm text-destructive" : "text-sm text-emerald-600"}>
                  {message}
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
