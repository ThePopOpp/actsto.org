import { Document, Page, View, StyleSheet, Text } from "@react-pdf/renderer";

import { Badge, BodyText, Heading, SmallText, pdfTheme } from "@/components/pdfx";
import type { InvoiceFormData } from "@/lib/admin/invoice-types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  block: {
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.border,
    paddingVertical: 8,
  },
  th: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: pdfTheme.primary,
    paddingBottom: 6,
    marginBottom: 2,
  },
  colDesc: { width: "52%" },
  colQty: { width: "14%", textAlign: "right" as const },
  colPrice: { width: "17%", textAlign: "right" as const },
  colTotal: { width: "17%", textAlign: "right" as const },
  thText: {
    fontSize: 8,
    fontWeight: 700,
    color: pdfTheme.primary,
    textTransform: "uppercase",
  },
  tdText: { fontSize: 9, color: pdfTheme.foreground },
  totals: {
    marginTop: 12,
    alignSelf: "flex-end",
    width: "42%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: pdfTheme.primary,
  },
  footer: {
    position: "absolute",
    bottom: 36,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: pdfTheme.border,
    paddingTop: 10,
  },
});

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoicePdfDocument({ data }: { data: InvoiceFormData }) {
  const subtotal = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const tax = subtotal * (data.taxRatePercent / 100);
  const total = subtotal + tax;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${data.dueDate}T12:00:00`);
  due.setHours(0, 0, 0, 0);
  const status =
    due < today
      ? { label: "Overdue", variant: "accent" as const }
      : { label: "Open", variant: "warning" as const };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Heading level={1}>Invoice</Heading>
            <BodyText muted>{`Arizona Christian Tuition · Nonprofit tuition organization`}</BodyText>
            <SmallText>{`hello@arizonachristiantuition.com · Phoenix, AZ`}</SmallText>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Badge label={status.label} variant={status.variant} />
            <BodyText muted>{`# ${data.invoiceNumber}`}</BodyText>
          </View>
        </View>

        <View style={styles.block}>
          <Heading level={3}>Bill to</Heading>
          <BodyText>{data.billToName}</BodyText>
          <BodyText muted>{data.billToEmail}</BodyText>
          {data.billToAddress.split("\n").map((line, idx) => (
            <BodyText key={`addr-${idx}`} muted>
              {line}
            </BodyText>
          ))}
        </View>

        <View style={styles.block}>
          <View style={{ flexDirection: "row", gap: 32, marginBottom: 8 }}>
            <View>
              <Heading level={3}>Issued</Heading>
              <BodyText>{data.issuedDate}</BodyText>
            </View>
            <View>
              <Heading level={3}>Due</Heading>
              <BodyText>{data.dueDate}</BodyText>
            </View>
          </View>
        </View>

        <View style={styles.th}>
          <Text style={[styles.thText, styles.colDesc]}>Description</Text>
          <Text style={[styles.thText, styles.colQty]}>Qty</Text>
          <Text style={[styles.thText, styles.colPrice]}>Rate</Text>
          <Text style={[styles.thText, styles.colTotal]}>Amount</Text>
        </View>
        {data.lines.map((line, i) => (
          <View key={`${line.description}-${i}`} style={styles.row} wrap={false}>
            <Text style={[styles.tdText, styles.colDesc]}>{line.description}</Text>
            <Text style={[styles.tdText, styles.colQty]}>{String(line.quantity)}</Text>
            <Text style={[styles.tdText, styles.colPrice]}>{money(line.unitPrice)}</Text>
            <Text style={[styles.tdText, styles.colTotal]}>
              {money(line.quantity * line.unitPrice)}
            </Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <BodyText muted>Subtotal</BodyText>
            <Text style={styles.tdText}>{money(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <BodyText muted>{`Tax (${data.taxRatePercent}%)`}</BodyText>
            <Text style={styles.tdText}>{money(tax)}</Text>
          </View>
          <View style={styles.grand}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: pdfTheme.primary }}>Total due</Text>
            <Text style={{ fontSize: 11, fontWeight: 700, color: pdfTheme.primary }}>{money(total)}</Text>
          </View>
        </View>

        {data.notes.trim() ? (
          <View style={{ marginTop: 28 }}>
            <Heading level={3}>Notes</Heading>
            <BodyText muted>{data.notes}</BodyText>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <SmallText>
            Generated with PDFx-style components on @react-pdf/renderer. Not a tax document; consult
            your advisor for Arizona tuition tax credit reporting.
          </SmallText>
        </View>
      </Page>
    </Document>
  );
}
