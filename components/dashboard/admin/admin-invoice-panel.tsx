"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { FileDown, Plus, Trash2 } from "lucide-react";

import { InvoicePdfDocument } from "@/components/dashboard/admin/invoice-pdf-document";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type InvoiceFormData,
  type InvoiceLine,
  defaultInvoiceFormData,
} from "@/lib/admin/invoice-types";

export function AdminInvoicePanel() {
  const [data, setData] = useState<InvoiceFormData>(() => defaultInvoiceFormData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof InvoiceFormData>(key: K, value: InvoiceFormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function setLine(i: number, patch: Partial<InvoiceLine>) {
    setData((d) => ({
      ...d,
      lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)),
    }));
  }

  function addLine() {
    setData((d) => ({
      ...d,
      lines: [...d.lines, { description: "", quantity: 1, unitPrice: 0 }],
    }));
  }

  function removeLine(i: number) {
    setData((d) => ({
      ...d,
      lines: d.lines.length > 1 ? d.lines.filter((_, j) => j !== i) : d.lines,
    }));
  }

  async function downloadPdf() {
    setError(null);
    setLoading(true);
    try {
      const doc = <InvoicePdfDocument data={data} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${data.invoiceNumber.replace(/[^\w.-]+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not generate PDF. Check the console for details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-primary">Sample invoice</CardTitle>
          <CardDescription>
            Edit fields below, then download a PDF built with{" "}
            <span className="font-medium">@react-pdf/renderer</span> and PDFx-style primitives (
            <a
              href="https://github.com/akii09/pdfx"
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              PDFx
            </a>
            ).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="inv-num">Invoice #</Label>
              <Input
                id="inv-num"
                className="mt-1.5"
                value={data.invoiceNumber}
                onChange={(e) => setField("invoiceNumber", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tax">Tax rate (%)</Label>
              <Input
                id="tax"
                type="number"
                min={0}
                step={0.01}
                className="mt-1.5"
                value={data.taxRatePercent}
                onChange={(e) => setField("taxRatePercent", Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="issued">Issued date</Label>
              <Input
                id="issued"
                type="date"
                className="mt-1.5"
                value={data.issuedDate}
                onChange={(e) => setField("issuedDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="due">Due date</Label>
              <Input
                id="due"
                type="date"
                className="mt-1.5"
                value={data.dueDate}
                onChange={(e) => setField("dueDate", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="bill-name">Bill to — name</Label>
            <Input
              id="bill-name"
              className="mt-1.5"
              value={data.billToName}
              onChange={(e) => setField("billToName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bill-email">Bill to — email</Label>
            <Input
              id="bill-email"
              type="email"
              className="mt-1.5"
              value={data.billToEmail}
              onChange={(e) => setField("billToEmail", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bill-addr">Bill to — address</Label>
            <Textarea
              id="bill-addr"
              className="mt-1.5 min-h-[88px]"
              value={data.billToAddress}
              onChange={(e) => setField("billToAddress", e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Line items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 size-4" />
                Add line
              </Button>
            </div>
            {data.lines.map((line, i) => (
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
                  disabled={data.lines.length <= 1}
                  aria-label="Remove line"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              className="mt-1.5 min-h-[72px]"
              value={data.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void downloadPdf()} disabled={loading}>
              <FileDown className="mr-2 size-4" />
              {loading ? "Generating…" : "Download PDF"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setData(defaultInvoiceFormData())}>
              Reset sample
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed border-primary/30 bg-muted/20">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-primary">How it works</CardTitle>
          <CardDescription>
            This mirrors the PDFx workflow: compose documents with small themed primitives (
            <code className="rounded bg-muted px-1 text-xs">Heading</code>,{" "}
            <code className="rounded bg-muted px-1 text-xs">BodyText</code>,{" "}
            <code className="rounded bg-muted px-1 text-xs">Badge</code>) on top of{" "}
            <code className="rounded bg-muted px-1 text-xs">@react-pdf/renderer</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Production can add <strong>server-side</strong> generation (email receipts, batch
            invoices) via a Route Handler using the same <code className="text-xs">InvoicePdfDocument</code>{" "}
            component.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
