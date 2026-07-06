"use client";

import { useEffect, useState } from "react";
import { Mail, FileDown, Loader2, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/lib/button-variants";
import type { InvoiceLine } from "@/lib/admin/invoice-types";
import { cn } from "@/lib/utils";

type InvoiceablePledge = {
  id: string;
  amount: number;
  status: string;
  campaignTitle: string;
  businessName: string;
  businessEmail: string | null;
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: string;
  issuedDate: string;
  dueDate: string;
  total: number;
  campaignTitle: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  paid: "default",
  overdue: "destructive",
  void: "outline",
};

export function AdminInvoicePanel() {
  const [pledges, setPledges] = useState<InvoiceablePledge[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [pledgeId, setPledgeId] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [taxRatePercent, setTaxRatePercent] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [pledgesRes, invoicesRes] = await Promise.all([
        fetch("/api/admin/pledges"),
        fetch("/api/admin/invoices"),
      ]);
      const pledgesData = await pledgesRes.json();
      const invoicesData = await invoicesRes.json();
      setPledges(pledgesData.pledges ?? []);
      setInvoices(invoicesData.invoices ?? []);
    } catch {
      setError("Could not load invoices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function setLine(i: number, patch: Partial<InvoiceLine>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, { description: "", quantity: 1, unitPrice: 0 }]);
  }
  function removeLine(i: number) {
    setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));
  }

  async function createInvoice() {
    setError(null);
    if (!pledgeId) {
      setError("Select a business donor pledge to invoice.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pledgeId, dueDate, lineItems: lines, taxRatePercent, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create invoice.");
      setPledgeId("");
      setNotes("");
      setLines([{ description: "", quantity: 1, unitPrice: 0 }]);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create invoice.");
    } finally {
      setCreating(false);
    }
  }

  async function markPaid(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid" }),
      });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function emailInvoice(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/invoices/${id}/email`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Could not email invoice.");
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">New invoice</CardTitle>
          <CardDescription>Bill a business donor against one of their pledges.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div>
            <Label>Business donor pledge</Label>
            <Select value={pledgeId} onValueChange={(v) => setPledgeId(v ?? "")}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={pledges.length ? "Select a pledge" : "No invoiceable pledges found"} />
              </SelectTrigger>
              <SelectContent>
                {pledges.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.businessName} — {p.campaignTitle} (${p.amount.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="due">Due date</Label>
              <Input id="due" type="date" className="mt-1.5" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tax">Tax rate (%)</Label>
              <Input
                id="tax"
                type="number"
                min={0}
                step={0.01}
                className="mt-1.5"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Line items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 size-4" />
                Add line
              </Button>
            </div>
            {lines.map((line, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/20 p-3 sm:flex-row sm:items-end"
              >
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`desc-${i}`}>Description</Label>
                  <Input
                    id={`desc-${i}`}
                    className="mt-1.5"
                    value={line.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                  />
                </div>
                <div className="w-full sm:w-20">
                  <Label htmlFor={`qty-${i}`}>Qty</Label>
                  <Input
                    id={`qty-${i}`}
                    type="number"
                    min={0}
                    step={1}
                    className="mt-1.5"
                    value={line.quantity}
                    onChange={(e) => setLine(i, { quantity: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="w-full sm:w-28">
                  <Label htmlFor={`price-${i}`}>Unit $</Label>
                  <Input
                    id={`price-${i}`}
                    type="number"
                    min={0}
                    step={0.01}
                    className="mt-1.5"
                    value={line.unitPrice}
                    onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) || 0 })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive"
                  onClick={() => removeLine(i)}
                  disabled={lines.length <= 1}
                  aria-label="Remove line"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" className="mt-1.5 min-h-[72px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button type="button" onClick={() => void createInvoice()} disabled={creating}>
            {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Create invoice
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">Invoices</CardTitle>
          <CardDescription>{loading ? "Loading…" : `${invoices.length} invoice(s)`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : null}
          {invoices.map((inv) => (
            <div key={inv.id} className="rounded-lg border border-border/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-medium">{inv.invoiceNumber}</span>
                <Badge variant={STATUS_VARIANT[inv.status] ?? "outline"}>{inv.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{inv.campaignTitle}</p>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span>Due {new Date(inv.dueDate).toLocaleDateString()}</span>
                <span className="font-medium">${inv.total.toLocaleString()}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`/api/admin/invoices/${inv.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <FileDown className="mr-1.5 size-3.5" />
                  PDF
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === inv.id}
                  onClick={() => void emailInvoice(inv.id)}
                >
                  <Mail className="mr-1.5 size-3.5" />
                  Email
                </Button>
                {inv.status !== "paid" ? (
                  <Button variant="outline" size="sm" disabled={busyId === inv.id} onClick={() => void markPaid(inv.id)}>
                    Mark paid
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
