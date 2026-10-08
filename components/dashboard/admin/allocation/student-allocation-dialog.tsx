"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StudentEligibility } from "@/lib/allocation/rules";

type AwardRow = {
  id: string;
  fundingLabel: string;
  amount: number;
  status: string;
  heldReason: string | null;
  reversalReason: string | null;
  note: string | null;
  campaignTitle: string | null;
  createdAt: string;
  createdByEmail: string | null;
  sent: number;
  payable: number;
  payments: { id: string; amount: number; paidAt: string; reference: string | null; status: string; voidReason: string | null }[];
};

type Detail = {
  student: { id: string; name: string; school: string | null; grade: string | null };
  eligibility: StudentEligibility;
  money: {
    tuitionCeiling: number | null;
    tuitionSource: string | null;
    ddCap: number | null;
    lowIncomeCap: number | null;
    sentAllFunds: number;
  };
  limits: { tuitionCeiling: number | null; tuitionReason: string | null; ddCap: number | null; ddCapReason: string | null };
  awards: AwardRow[];
  recommendations: { date: string; amount: number; campaign: string | null; donor: string }[];
  error?: string;
};

function usd(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

const STATUS_LABEL: Record<string, string> = {
  awarded: "Awarded",
  held_esa: "Held (ESA documentation pending)",
  reversed: "Reversed",
};

async function post(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(data?.error ?? "That was not saved.");
}

export function StudentAllocationDialog({
  studentId,
  schoolYear,
  onClose,
  onChanged,
}: {
  studentId: string;
  schoolYear: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pay, setPay] = useState<Record<string, { amount: string; paidAt: string; reference: string }>>({});
  const [tuition, setTuition] = useState({ value: "", reason: "" });
  const [dd, setDd] = useState({ value: "", reason: "" });

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/admin/allocation/student?studentId=${encodeURIComponent(studentId)}&year=${encodeURIComponent(schoolYear)}`,
      { cache: "no-store" },
    );
    const data = (await res.json().catch(() => null)) as Detail | null;
    setDetail(data);
    if (data?.limits) {
      setTuition({ value: data.limits.tuitionCeiling != null ? String(data.limits.tuitionCeiling) : "", reason: data.limits.tuitionReason ?? "" });
      setDd({ value: data.limits.ddCap != null ? String(data.limits.ddCap) : "", reason: data.limits.ddCapReason ?? "" });
    }
  }, [studentId, schoolYear]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount, as elsewhere in admin
    void load();
  }, [load]);

  async function act(fn: () => Promise<void>, ok: string) {
    setMessage(null);
    try {
      await fn();
      setMessage({ ok: true, text: ok });
      await load();
      onChanged();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "That was not saved." });
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">{detail?.student.name ?? "Student"}</DialogTitle>
          <DialogDescription>
            {schoolYear} · {detail?.student.school ?? "School not set"} · {detail?.student.grade ?? "grade not set"}
          </DialogDescription>
        </DialogHeader>

        {!detail ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-6 text-sm">
            <section className="flex flex-wrap gap-1.5">
              {(
                [
                  ["approvedApplication", "Approved application"],
                  ["overflow", "Overflow"],
                  ["low_income", "Low-income"],
                  ["disabled", "Disabled"],
                  ["displaced", "Displaced"],
                ] as const
              ).map(([key, label]) => (
                <Badge key={key} variant={detail.eligibility[key] ? "secondary" : "outline"} className={detail.eligibility[key] ? "" : "text-muted-foreground"}>
                  {detail.eligibility[key] ? "✓" : "✗"} {label}
                </Badge>
              ))}
            </section>

            <section className="grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
              <div>
                <p className="font-medium text-foreground">Tuition ceiling</p>
                <p className="text-xs text-muted-foreground">
                  {usd(detail.money.tuitionCeiling)}
                  {detail.money.tuitionSource === "application" ? " from the application" : detail.money.tuitionSource === "override" ? " (entered by staff)" : ""}
                  {" · "}sent so far {usd(detail.money.sentAllFunds)}
                </p>
                <div className="mt-2 flex gap-2">
                  <Input aria-label="Tuition ceiling" placeholder="Override $" value={tuition.value} onChange={(e) => setTuition({ ...tuition, value: e.target.value })} />
                </div>
                <Input className="mt-2" aria-label="Reason for tuition override" placeholder="Reason" value={tuition.reason} onChange={(e) => setTuition({ ...tuition, reason: e.target.value })} />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() =>
                    void act(
                      () => post("/api/admin/allocation/limits", { studentId, schoolYear, tuitionCeiling: tuition.value || null, tuitionReason: tuition.reason }, "PUT"),
                      "Tuition ceiling saved.",
                    )
                  }
                >
                  Save tuition
                </Button>
              </div>
              <div>
                <p className="font-medium text-foreground">Disabled/displaced cap</p>
                <p className="text-xs text-muted-foreground">
                  The lesser of tuition or 90% of state aid (A.R.S. §§ 43-1184, 43-1505). Currently {usd(detail.money.ddCap)}.
                  Low-income cap for this grade: {usd(detail.money.lowIncomeCap)}.
                </p>
                <Input className="mt-2" aria-label="Disabled/displaced cap" placeholder="Cap $" value={dd.value} onChange={(e) => setDd({ ...dd, value: e.target.value })} />
                <Input className="mt-2" aria-label="How the cap was worked out" placeholder="How it was worked out (state aid figure, document)" value={dd.reason} onChange={(e) => setDd({ ...dd, reason: e.target.value })} />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() =>
                    void act(
                      () => post("/api/admin/allocation/limits", { studentId, schoolYear, ddCap: dd.value || null, ddCapReason: dd.reason }, "PUT"),
                      "Disabled/displaced cap saved.",
                    )
                  }
                >
                  Save cap
                </Button>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-heading text-base font-semibold text-primary">Awards</h3>
              {detail.awards.length === 0 ? (
                <p className="text-muted-foreground">No awards for {schoolYear} yet.</p>
              ) : (
                detail.awards.map((award) => {
                  const form = pay[award.id] ?? { amount: "", paidAt: today, reference: "" };
                  const notPayable = Math.max(0, award.amount - award.sent - award.payable);
                  return (
                    <div key={award.id} className="space-y-2 rounded-lg border border-border/60 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {award.fundingLabel} · {usd(award.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {award.createdAt.slice(0, 10)}
                            {award.createdByEmail ? ` by ${award.createdByEmail}` : ""}
                            {award.campaignTitle ? ` · from ${award.campaignTitle}` : ""}
                            {award.note ? ` · ${award.note}` : ""}
                          </p>
                        </div>
                        <Badge variant={award.status === "awarded" ? "secondary" : "outline"}>{STATUS_LABEL[award.status] ?? award.status}</Badge>
                      </div>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        Sent {usd(award.sent)} · can still send {usd(award.payable)}
                        {notPayable > 0 && award.status !== "reversed" ? ` · ${usd(notPayable)} awarded, not payable (tuition or cap)` : ""}
                      </p>
                      {award.heldReason && award.status === "held_esa" ? <p className="text-xs text-amber-700 dark:text-amber-400">{award.heldReason}</p> : null}
                      {award.reversalReason ? <p className="text-xs text-muted-foreground">Reversed: {award.reversalReason}</p> : null}
                      {award.payments.length ? (
                        <ul className="space-y-1 text-xs">
                          {award.payments.map((p) => (
                            <li key={p.id} className="flex flex-wrap items-center gap-2">
                              <span className={p.status === "void" ? "line-through" : ""}>
                                {usd(p.amount)} sent {p.paidAt}
                                {p.reference ? ` · ref ${p.reference}` : ""}
                              </span>
                              {p.status === "void" ? (
                                <span className="text-muted-foreground">void: {p.voidReason}</span>
                              ) : (
                                <button
                                  type="button"
                                  className="text-destructive underline-offset-2 hover:underline"
                                  onClick={() => {
                                    const reason = window.prompt("Why is this payment being voided?");
                                    if (reason) void act(() => post(`/api/admin/allocation/disbursements/${p.id}`, { action: "void", reason }), "Payment voided.");
                                  }}
                                >
                                  Void
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {award.status === "awarded" ? (
                        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                          <div>
                            <Label className="text-xs">Send to school $</Label>
                            <Input value={form.amount} inputMode="decimal" onChange={(e) => setPay({ ...pay, [award.id]: { ...form, amount: e.target.value } })} />
                          </div>
                          <div>
                            <Label className="text-xs">Date sent</Label>
                            <Input type="date" value={form.paidAt} onChange={(e) => setPay({ ...pay, [award.id]: { ...form, paidAt: e.target.value } })} />
                          </div>
                          <div>
                            <Label className="text-xs">Check or reference</Label>
                            <Input value={form.reference} onChange={(e) => setPay({ ...pay, [award.id]: { ...form, reference: e.target.value } })} />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              void act(
                                () =>
                                  post("/api/admin/allocation/disbursements", {
                                    awardId: award.id,
                                    amount: Number(form.amount.replace(/[^0-9.]/g, "")),
                                    paidAt: form.paidAt,
                                    reference: form.reference,
                                  }),
                                "Recorded as sent to school.",
                              )
                            }
                          >
                            Mark sent
                          </Button>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        {award.status === "held_esa" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const note = window.prompt("Which Department of Education document shows the ESA contract closed or lapsed?");
                              if (note) void act(() => post(`/api/admin/allocation/awards/${award.id}`, { action: "release_hold", note }), "Hold released.");
                            }}
                          >
                            Release ESA hold
                          </Button>
                        ) : null}
                        {award.status !== "reversed" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => {
                              const reason = window.prompt("Why is this award being reversed?");
                              if (reason) void act(() => post(`/api/admin/allocation/awards/${award.id}`, { action: "reverse", reason }), "Award reversed.");
                            }}
                          >
                            Reverse
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            <section className="space-y-2">
              <h3 className="font-heading text-base font-semibold text-primary">Donor recommendations</h3>
              <p className="text-xs text-muted-foreground">Context only. A recommendation never decides an award.</p>
              {detail.recommendations.length === 0 ? (
                <p className="text-muted-foreground">None.</p>
              ) : (
                <ul className="space-y-1">
                  {detail.recommendations.map((r, i) => (
                    <li key={i}>
                      {r.date} · {r.donor} · {usd(r.amount)}
                      {r.campaign ? ` · via ${r.campaign}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {message ? (
              <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
                {message.text}
              </p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
