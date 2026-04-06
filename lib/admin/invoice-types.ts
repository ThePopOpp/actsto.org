export type InvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceFormData = {
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string;
  billToName: string;
  billToEmail: string;
  billToAddress: string;
  lines: InvoiceLine[];
  taxRatePercent: number;
  notes: string;
};

export function defaultInvoiceFormData(): InvoiceFormData {
  return {
    invoiceNumber: "ACT-2026-0142",
    issuedDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    billToName: "Valley Christian Schools — Business Office",
    billToEmail: "business@example.edu",
    billToAddress: "6900 W. Germann Rd.\nChandler, AZ 85298",
    lines: [
      { description: "Corporate tuition scholarship pledge — Q1 2026", quantity: 1, unitPrice: 5000 },
      { description: "Program administrative fee", quantity: 1, unitPrice: 150 },
    ],
    taxRatePercent: 0,
    notes: "Thank you for supporting Arizona families through Arizona Christian Tuition.",
  };
}
